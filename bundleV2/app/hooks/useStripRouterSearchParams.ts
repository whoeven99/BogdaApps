import { useEffect } from "react";
import { useFetchers, useNavigate, useSearchParams } from "react-router";
import {
  buildAppSearchString,
  hasInternalSearchParams,
} from "../utils/appSearchParams";

/** 移除 React Router 写入的 ?index= / ?_routes=，避免刷新后 URL 残留内部参数 */
export function useStripRouterSearchParams(): void {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fetchers = useFetchers();
  const hasActiveFetcher = fetchers.some((fetcher) => fetcher.state !== "idle");

  useEffect(() => {
    if (!hasInternalSearchParams(searchParams)) return;
    // fetcher 提交期间会短暂写入 ?index=；此时 navigate 会打断进行中的保存请求
    if (hasActiveFetcher) return;
    navigate({ search: buildAppSearchString(searchParams) }, { replace: true });
  }, [hasActiveFetcher, navigate, searchParams]);
}
