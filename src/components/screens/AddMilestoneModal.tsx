"use client";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { X, ImagePlus, Loader2 } from "lucide-react";
import { request } from "@/lib/api/request";
import { memory, storage } from "@eazo/sdk";

const TYPES = [
  { value: "photo", label: "Photo" },
  { value: "quote", label: "Quote" },
  { value: "achievement", label: "Achievement" },
  { value: "artwork", label: "Artwork" },
  { value: "milestone", label: "Milestone" },
  { value: "video", label: "Video" },
  { value: "voice", label: "Voice Note" },
];

type Milestone = { id: string; kidId: string; type: string; title?: string | null; content?: string | null; mediaUrl?: string | null; date: string };

export function AddMilestoneModal({ kidId, onClose, onAdded }: { kidId: string; onClose: () => void; onAdded: (m: Milestone) => void }) {
  const [type, setType] = useState("quote");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setUploadedUrl(null);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setUploadedUrl(null);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;
    setUploadingImage(true);
    try {
      const key = `memories/${kidId}/${Date.now()}-${imageFile.name}`;
      const { url } = await storage.upload(key, imageFile, { contentType: imageFile.type });
      setUploadedUrl(url);
      return url;
    } catch (err) {
      console.error("[AddMilestoneModal] image upload failed", err);
      return null;
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Upload image first if one was selected
      let mediaUrl = uploadedUrl;
      if (imageFile && !uploadedUrl) {
        mediaUrl = await uploadImage();
      }

      const res = await request("/api/milestones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidId, type, title, content, date, mediaUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        memory.reportAction({
          content: `User added memory "${title || type}" for kid ${kidId}`,
          event_type: "create",
          page: "memories",
          metadata: { type: "add_milestone", milestone_id: data.milestone.id, has_image: !!mediaUrl },
        }).catch(() => {});
        onAdded(data.milestone);
      } else {
        const err = await res.json().catch(() => ({})) as { error?: string };
        console.error("[AddMilestoneModal] save failed:", err.error ?? res.status);
        alert(err.error ?? "Failed to save memory. Please try again.");
      }
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative z-10 bg-white rounded-t-2xl sm:rounded-2xl p-6 w-full sm:max-w-md shadow-lg max-h-[92svh] overflow-y-auto"
        style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#1C1A17]" style={{ fontFamily: "var(--font-heading)" }}>Add Memory</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Type selector */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Memory Type</label>
            <div className="flex gap-1.5 flex-wrap">
              {TYPES.map(t => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={["font-mono text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border transition-all",
                    type === t.value ? "bg-[#C96A4B] text-white border-transparent" : "bg-white text-[#A8A29E] border-[#EDE9DF]"].join(" ")}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Image upload — separate box, always visible */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">
              Photo / Image <span className="text-[#A8A29E] normal-case font-normal">(optional — any memory type)</span>
            </label>
            <div
              className={[
                "relative rounded-xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden",
                imagePreview ? "border-[#C96A4B]/40 bg-stone-50" : "border-[#EDE9DF] bg-[#FDFBF7] hover:border-[#C96A4B]/40 hover:bg-stone-50",
              ].join(" ")}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
            >
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition flex items-center justify-center">
                    <span className="opacity-0 hover:opacity-100 bg-white/90 text-xs font-mono px-2 py-1 rounded transition">Change photo</span>
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setImageFile(null); setImagePreview(null); setUploadedUrl(null); }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
                  >
                    <X size={12} />
                  </button>
                  {uploadedUrl && (
                    <div className="absolute bottom-2 left-2 bg-[#508D76]/90 text-white text-[9px] font-mono px-2 py-0.5 rounded">
                      Uploaded ✓
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 px-4 text-center">
                  <ImagePlus size={24} className="text-[#A8A29E]" />
                  <p className="text-xs text-[#57534E]">Drag & drop or tap to add a photo</p>
                  <p className="text-[10px] text-[#A8A29E] font-mono">JPEG · PNG · WebP · GIF</p>
                </div>
              )}
              {uploadingImage && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-[#C96A4B]" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          {/* Title */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. First steps, Funny quote..."
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
          </div>

          {/* Content */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">
              {type === "quote" ? "The Quote" : type === "artwork" ? "Description" : "Notes"}
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)} rows={3}
              placeholder={type === "quote" ? "What did they say?" : "Add any notes or details..."}
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30 resize-none" />
          </div>

          {/* Date */}
          <div>
            <label className="font-mono text-[10px] uppercase tracking-wider text-[#57534E] block mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full text-base border border-[#EDE9DF] rounded-lg px-3 py-2.5 bg-[#FDFBF7] focus:outline-none focus:ring-2 focus:ring-[#C96A4B]/30" />
          </div>

          <motion.button type="submit" disabled={loading || uploadingImage} whileTap={{ scale: 0.97 }}
            className="w-full py-3 bg-[#C96A4B] text-white font-semibold rounded-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2">
            {(loading || uploadingImage) && <Loader2 size={14} className="animate-spin" />}
            {uploadingImage ? "Uploading image…" : loading ? "Saving…" : "Save Memory"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
