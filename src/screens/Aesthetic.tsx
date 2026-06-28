import { useState, useEffect } from 'react';
import { PageBackground } from '../components/PageBackground';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { PhotoField } from '../components/PhotoField';
import { Photo } from '../components/Photo';
import { putImage } from '../lib/imageStore';
import { useLocalStorage, newId } from '../storage/useLocalStorage';
import type { AestheticPost } from '../storage/types';
import { formatShortDate } from '../lib/date';

const blank = (imageData = ''): AestheticPost => ({
  id: newId(),
  imageData,
  tags: [],
  savedAt: new Date().toISOString(),
});

export function Aesthetic() {
  const [posts, setPosts] = useLocalStorage<AestheticPost[]>('aesthetic', []);
  const [draft, setDraft] = useState<AestheticPost | null>(null);
  const [view, setView] = useState<AestheticPost | null>(null);
  const [tagText, setTagText] = useState('');

  // Принимаем шаринг из Instagram/Pinterest через Android intent
  useEffect(() => {
    function onShare(e: Event) {
      const detail = (e as CustomEvent<{ type: string; data: string }>).detail;
      if (detail.type === 'image') {
        setDraft(blank('data:image/jpeg;base64,' + detail.data));
      } else if (detail.type === 'url') {
        // URL без изображения — открываем форму с подписью-ссылкой
        setDraft({ ...blank(), caption: detail.data });
      }
    }
    window.addEventListener('grimoire:share', onShare);
    return () => window.removeEventListener('grimoire:share', onShare);
  }, []);

  async function save() {
    if (!draft) return;
    if (!draft.imageData) { setDraft(null); return; }
    // Картинка из Android-шаринга приходит как inline dataURL — кладём её в IndexedDB,
    // чтобы не раздувать localStorage (фото из PhotoField уже ссылки).
    const post = draft.imageData.startsWith('data:')
      ? { ...draft, imageData: await putImage(draft.imageData) }
      : draft;
    const exists = posts.some((p) => p.id === post.id);
    setPosts(exists ? posts.map((p) => (p.id === post.id ? post : p)) : [post, ...posts]);
    setDraft(null);
    setTagText('');
  }

  function remove(id: string) {
    setPosts(posts.filter((p) => p.id !== id));
    setDraft(null); setView(null);
  }

  function addTag() {
    const t = tagText.trim().toLowerCase();
    if (draft && t && !draft.tags.includes(t)) setDraft({ ...draft, tags: [...draft.tags, t] });
    setTagText('');
  }

  return (
    <>
      <PageBackground k="aesthetic" />
      <div className="page">
        <PageHeader
          eyebrow="Красота и вдохновение"
          title="Эстетика"
          action={<button className="chip chip--active" onClick={() => { setDraft(blank()); setTagText(''); }}>＋ образ</button>}
        />

        {posts.length === 0 ? (
          <div className="empty">
            <span className="glyph">🌸</span>
            Поделись из Instagram или Pinterest — картинка появится здесь.
            <div className="spacer" />
            <button className="btn btn--ghost" onClick={() => setDraft(blank())}>Добавить вручную</button>
          </div>
        ) : (
          <div className="aesthetic-grid">
            {posts.map((p) => (
              <button key={p.id} className="aesthetic-item" onClick={() => setView(p)}>
                <Photo src={p.imageData} alt={p.caption ?? ''} />
                {p.caption && <span className="aesthetic-item__caption">{p.caption}</span>}
              </button>
            ))}
          </div>
        )}
        <div className="spacer" />
      </div>

      {/* Просмотр */}
      {view && (
        <Sheet title={view.caption ?? formatShortDate(view.savedAt)} onClose={() => setView(null)}>
          <Photo src={view.imageData} style={{ width: '100%', borderRadius: 'var(--radius)', marginBottom: 12 }} />
          {view.caption && <p style={{ margin: '0 0 8px', wordBreak: 'break-word' }}>{view.caption}</p>}
          {view.tags.length > 0 && (
            <div className="row row--wrap" style={{ marginBottom: 10 }}>
              {view.tags.map((t) => <span key={t} className="chip" style={{ fontSize: '0.68rem' }}>#{t}</span>)}
            </div>
          )}
          <p className="muted" style={{ fontSize: '0.8rem' }}>{formatShortDate(view.savedAt)}</p>
          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--ghost btn--block" onClick={() => { setDraft({ ...view }); setView(null); setTagText(''); }}>Редактировать</button>
            <button className="btn btn--ghost" onClick={() => remove(view.id)}>🗑</button>
          </div>
        </Sheet>
      )}

      {/* Редактор */}
      {draft && (
        <Sheet title="Образ" onClose={save}>
          <label className="label">Изображение</label>
          <PhotoField value={draft.imageData || undefined} onChange={(p) => setDraft({ ...draft, imageData: p ?? '' })} />

          <div className="spacer" />
          <label className="label">Подпись или ссылка</label>
          <input className="field" placeholder="Откуда, о чём…" value={draft.caption ?? ''}
            onChange={(e) => setDraft({ ...draft, caption: e.target.value || undefined })} />

          <div className="spacer" />
          <label className="label">Теги</label>
          <div className="tag-input-row">
            <input className="field" placeholder="добавить тег" value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTag()} />
            <button className="btn btn--ghost" onClick={addTag}>＋</button>
          </div>
          {draft.tags.length > 0 && (
            <div className="row row--wrap" style={{ marginTop: 8 }}>
              {draft.tags.map((t) => (
                <button key={t} className="chip"
                  onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}>
                  #{t} ✕
                </button>
              ))}
            </div>
          )}

          <div className="spacer" />
          <div className="fab-bar">
            <button className="btn btn--primary btn--block" onClick={save}>Сохранить</button>
            {posts.some((p) => p.id === draft.id) && (
              <button className="btn btn--ghost" onClick={() => remove(draft.id)}>🗑</button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
