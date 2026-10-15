import { useLayoutEffect, useRef } from 'react';
import { createSearchParams, useSearchParams, type NavigateOptions, type URLSearchParamsInit } from 'react-router-dom';
// Preserve consecutive filter changes while the router is still rendering a transition.
export function useListParams() {
  const [params, navigate] = useSearchParams();
  const current = useRef(params);
  useLayoutEffect(() => { current.current = params; }, [params]);
  const change = (next: URLSearchParamsInit | ((previous: URLSearchParams) => URLSearchParamsInit), options?: NavigateOptions) => {
    const result = createSearchParams(typeof next === 'function' ? next(new URLSearchParams(current.current)) : next);
    current.current = result; navigate(result, options);
  };
  return [params, change] as const;
}
