import type { ComponentProps } from 'react';
import type { SidebarTab } from '../../app/types';
import { DetailPanel } from './DetailPanel';
import { SourcePanel } from './SourcePanel';
import styles from './Sidebar.module.css';

type SidebarProps = {
  sidebarTab: SidebarTab;
  setSidebarTab: (tab: SidebarTab) => void;
  detailProps: ComponentProps<typeof DetailPanel>;
  sourceProps: ComponentProps<typeof SourcePanel>;
};

export function Sidebar(props: SidebarProps) {
  const { sidebarTab, setSidebarTab, detailProps, sourceProps } = props;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabButton} ${sidebarTab === 'detail' ? styles.tabButtonActive : ''}`}
          onClick={() => setSidebarTab('detail')}
        >
          Detail
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${sidebarTab === 'source' ? styles.tabButtonActive : ''}`}
          onClick={() => setSidebarTab('source')}
        >
          Source
        </button>
      </div>

      <div
        className={styles.content}
        onMouseEnter={(event) => {
          event.stopPropagation();
        }}
        onWheelCapture={(event) => {
          event.stopPropagation();
        }}
      >
        {sidebarTab === 'detail' ? <DetailPanel {...detailProps} /> : <SourcePanel {...sourceProps} />}
      </div>
    </aside>
  );
}
