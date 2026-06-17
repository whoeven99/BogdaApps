import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  buildAppSearchString,
  hasInternalSearchParams,
} from "../utils/appSearchParams";

/** 移除 React Router 写入的 ?index= / ?_routes=，避免刷新后 URL 残留内部参数 */
export function useStripRouterSearchParams(): void {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!hasInternalSearchParams(searchParams)) return;
    navigate({ search: buildAppSearchString(searchParams) }, { replace: true });
  }, [navigate, searchParams]);
}
