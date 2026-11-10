import { useState } from 'react';
import { Bookmark, RotateCcw } from 'lucide-react';
import { useI18n } from '@/i18n';
import { Button, DeleteButton, Popover } from '@/components/ui';

/** Saved views — a named set of matrix columns and/or charts, kept in this
 *  browser. Loading one replaces what is on screen. Works for any view shape;
 *  it only needs an id and a name. */
export function ViewsMenu<V extends { id: string; name: string }>({
  views,
  onLoad,
  onSave,
  onDelete,
  onReset,
}: {
  views: V[];
  onLoad: (view: V) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
}) {
  const { t } = useI18n();
  const [name, setName] = useState('');

  return (
    <Popover
      align="end"
      className="w-[min(20rem,calc(100vw-1rem))] p-3"
      trigger={({ toggle }) => (
        <Button icon={<Bookmark size={14} />} onClick={toggle}>
          {t('cmp.views')}
          {views.length > 0 && <span className="text-gray-400">· {views.length}</span>}
        </Button>
      )}
    >
      {(close) => (
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('cmp.views.saved')}
          </div>
          {views.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('cmp.views.empty')}</p>
          ) : (
            <ul className="max-h-52 space-y-0.5 overflow-y-auto">
              {views.map((v) => (
                <li key={v.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onLoad(v);
                      close();
                    }}
                    className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-sm text-brame-dark hover:bg-brame-teal/10 dark:text-gray-100 dark:hover:bg-white/10"
                  >
                    {v.name}
                  </button>
                  <DeleteButton label={`${t('cmp.views.delete')}: ${v.name}`} onClick={() => onDelete(v.id)} />
                </li>
              ))}
            </ul>
          )}
          <form
            className="flex gap-2 border-t border-gray-200 pt-3 dark:border-white/10"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              onSave(name.trim());
              setName('');
              close();
            }}
          >
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('cmp.views.name')}
              aria-label={t('cmp.views.name')}
              maxLength={40}
              className="h-9 min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-base text-brame-dark outline-none focus:border-brame-teal sm:text-sm dark:border-white/15 dark:bg-white/5 dark:text-gray-100"
            />
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              {t('common.save')}
            </Button>
          </form>
          <button
            type="button"
            onClick={() => {
              onReset();
              close();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-brame-dark dark:text-gray-400 dark:hover:text-gray-100"
          >
            <RotateCcw size={12} />
            {t('cmp.views.reset')}
          </button>
        </div>
      )}
    </Popover>
  );
}
