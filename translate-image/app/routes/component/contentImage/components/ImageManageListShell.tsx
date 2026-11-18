import type { ReactNode } from "react";
import listStyles from "~/ui/styles/appListPage.module.css";

export function ImageManageListShell({
  toolbar,
  bulkBar,
  children,
}: {
  toolbar: ReactNode;
  bulkBar?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={listStyles.listTableAction}>
      <div
        className={`${listStyles.listToolbar} ${listStyles.listToolbarNowrap} ${listStyles.listToolbarFiltersElevated}`}
      >
        <div className={listStyles.listToolbarMain}>{toolbar}</div>
        {bulkBar ? <div className={listStyles.listToolbarBulk}>{bulkBar}</div> : null}
      </div>
      {children}
    </div>
  );
}
