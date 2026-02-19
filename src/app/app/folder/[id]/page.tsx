/**
 * @file src/app/app/folder/[id]/page.tsx
 * Custom folder view (/app/folder/[id]).
 *
 * Shows opened letters that the user has moved into a custom folder.
 * Folder name displayed in the heading.
 *
 * TODO (Session 5): Implement — fetch folder + letters from GET /api/folders/[id].
 */

export default function CustomFolderPage({ params }: { params: { id: string } }) {
  // TODO: fetch folder by id and its letters
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-serif text-ink">Folder</h1>
      <p className="text-ink-muted text-sm">TODO: folder {params.id} contents</p>
    </div>
  );
}
