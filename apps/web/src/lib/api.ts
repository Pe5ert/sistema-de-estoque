const baseUrl = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');
export const apiUrl = (path: string) => `${baseUrl}${path}`;
export const UNAUTHORIZED_EVENT = 'stock:unauthorized';

export class ApiError extends Error {
  constructor(public readonly status: number, detail?: string) {
    super(detail ?? (status === 0 || status === 503
      ? 'Não foi possível conectar ao servidor.'
      : status === 429
        ? 'Muitas tentativas. Aguarde um minuto e tente novamente.'
        : status === 400 ? 'Confira os campos informados.'
        : status === 401 ? 'Sua sessão expirou. Entre novamente.'
        : status === 403 ? 'Você não tem permissão para esta ação.'
        : status === 404 ? 'Registro não encontrado.'
        : status === 409 ? 'Os dados conflitam com outro registro. Confira e tente novamente.'
        : 'Não foi possível concluir a solicitação. Tente novamente.'));
  }
}

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: 'include',
      headers: { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new ApiError(0);
  }
  if (!response.ok) {
    if (response.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const body = await response.json().catch(() => null);
    const known = ['Este SKU já está em uso.', 'Este código de barras já está em uso.', 'Este nome já está em uso.', 'Quantidade indisponível em estoque.', 'Selecione uma categoria ativa.', 'Produto inativo não pode ser movimentado.', 'Já existe um backup em andamento.'];
    const procurementMessages = ['Este CPF/CNPJ já está em uso.', 'Fornecedor não encontrado.', 'Selecione um fornecedor ativo.', 'Selecione somente produtos ativos.', 'Não repita o mesmo produto ou item na operação.', 'Somente rascunhos podem ser editados.', 'Somente rascunhos podem ser enviados.', 'O pedido foi atualizado por outra pessoa. Recarregue antes de continuar.', 'Este pedido não pode ser cancelado.', 'Identificador de recebimento já usado com outros dados.', 'Este pedido não está disponível para recebimento.', 'Quantidade superior ao saldo pendente do pedido.', 'Item não pertence a este pedido.', 'A unidade de um produto mudou. Revise o pedido antes de continuar.', 'Valor do item excede o limite.', 'Valor do pedido excede o limite.'];
    const operationalMessage = (path.startsWith('/imports') || path.startsWith('/physical-inventories'))
      && [400, 409, 413].includes(response.status) && typeof body?.message === 'string';
    throw new ApiError(response.status, known.includes(body?.message) || procurementMessages.includes(body?.message) || operationalMessage ? body.message : undefined);
  }
  if (response.status === 204) return undefined as T;
  try {
    return await response.json() as T;
  } catch {
    throw new ApiError(500);
  }
}
