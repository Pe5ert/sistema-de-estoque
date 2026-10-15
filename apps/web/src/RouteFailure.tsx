import { Link } from 'react-router-dom';
export function RouteFailure() {
  return <main className="route-failure"><h1>Não foi possível abrir esta tela.</h1><p>Tente recarregar. Se estava preenchendo um formulário, confira os dados antes de repetir o salvamento.</p><button type="button" className="primary-button" onClick={() => window.location.reload()}>Recarregar página</button><Link className="text-button" to="/">Ir ao início</Link></main>;
}
export function NotFound() {
  return <section className="empty-state"><h2>Página não encontrada</h2><p>O endereço pode estar incorreto ou ter mudado.</p><Link className="primary-button" to="/">Ir à visão geral</Link></section>;
}
