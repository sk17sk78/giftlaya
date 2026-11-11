import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Upload, Copy, Trash2, Search } from "lucide-react";
import { adminApi } from "@/api/client";
import { PermissionGuard } from "@/components/ui/PermissionGuard";
import { useToast } from "@/components/ui/Toast";

export function MediaLibraryPage() {
  const qc = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("catalog");
  const [altText, setAltText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["media-assets", search],
    queryFn: () => adminApi.listMediaAssets(undefined, search || undefined, 1),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => adminApi.uploadMedia(file, folder, altText || file.name),
    onSuccess: (asset) => {
      showToast(`Uploaded ${asset.file_key}`, "success");
      setAltText("");
      qc.invalidateQueries({ queryKey: ["media-assets"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => adminApi.deleteMediaAsset(id),
    onSuccess: () => {
      showToast("Asset deleted", "success");
      qc.invalidateQueries({ queryKey: ["media-assets"] });
    },
    onError: (e: Error) => showToast(e.message, "error"),
  });

  return (
    <PermissionGuard module="image">
      <div className="space-y-4 animate-bd-fade-up">
        <div>
          <h1 className="font-heading text-xl font-bold flex items-center gap-2">
            <ImageIcon size={20} className="text-[#4f6ef7]" />
            Media Library & CDN Assets
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload images to S3 / local CDN storage with folder organization and alt text.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search file or alt text..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 w-52"
              />
            </div>
            <input
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="Folder (catalog, banners)"
              className="px-3 py-1.5 rounded-xl border border-slate-200 w-40"
            />
            <input
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Default alt text"
              className="px-3 py-1.5 rounded-xl border border-slate-200 w-44"
            />
          </div>

          <PermissionGuard module="image" requireWrite fallback={null}>
            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6ef7] text-white font-semibold cursor-pointer">
              <Upload size={14} /> Upload Image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadMut.mutate(file);
                }}
              />
            </label>
          </PermissionGuard>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400 py-8 text-center">Loading media assets...</p>
        ) : (data?.items || []).length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-10 text-center text-xs text-slate-400">
            <ImageIcon size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-600 dark:text-slate-300">No media assets found</p>
            <p className="mt-1">Upload an image above to host it in the CDN asset library.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {(data?.items || []).map((a) => (
              <div key={a.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden text-xs">
                <div className="aspect-square bg-slate-100 dark:bg-slate-800">
                  <img src={a.cdn_url} alt={a.alt_text || a.file_key} className="w-full h-full object-cover" />
                </div>
                <div className="p-2.5 space-y-1.5">
                  <p className="font-semibold truncate">{a.alt_text || a.file_key}</p>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(a.cdn_url || "");
                        showToast("CDN URL copied", "success");
                      }}
                      className="inline-flex items-center gap-1 text-[11px] text-[#4f6ef7] font-semibold cursor-pointer"
                    >
                      <Copy size={11} /> Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteMut.mutate(a.id!)}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

