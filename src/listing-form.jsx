import { useEffect, useRef, useState } from "react";
import { MapPin, Search, CloudUpload as UploadCloud, X, Image as ImageIcon, Loader as Loader2, Crosshair, CircleCheck as CheckCircle2, Camera, Images, CircleCheck as CheckIcon, Star } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Badge,
  cn,
} from "./components.jsx";
import { propertyTypes } from "./data.js";
import { supabase, PROPERTY_BUCKET } from "./lib/supabase.js";

/* ---------- Google Maps "Drop Pin" component ---------- */
const DEFAULT_CENTER = { lat: 6.45, lng: 3.4 }; // Lagos

export function MapPicker({ value, onChange }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manualLat, setManualLat] = useState(value?.lat ?? "");
  const [manualLng, setManualLng] = useState(value?.lng ?? "");

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if (!apiKey) {
      setError(
        "Google Maps API key not set. Add VITE_GOOGLE_MAPS_API_KEY to .env to enable the map."
      );
      setLoading(false);
      return;
    }
    if (window.google?.maps) {
      initMap();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.onload = () => initMap();
    script.onerror = () => {
      setError("Failed to load Google Maps. Check your network and API key.");
      setLoading(false);
    };
    document.head.appendChild(script);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function initMap() {
    if (!mapRef.current || !window.google?.maps) return;
    const center = value?.lat ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER;
    mapInstance.current = new window.google.maps.Map(mapRef.current, {
      center,
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    });
    markerRef.current = new window.google.maps.Marker({
      position: center,
      map: mapInstance.current,
      draggable: true,
      title: "Drag the pin to set the exact location",
    });
    mapInstance.current.addListener("click", (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      placeMarker(lat, lng);
    });
    markerRef.current.addListener("dragend", (e) => {
      placeMarker(e.latLng.lat(), e.latLng.lng());
    });
    setLoading(false);
  }

  function placeMarker(lat, lng) {
    if (!markerRef.current || !mapInstance.current) return;
    const pos = { lat, lng };
    markerRef.current.setPosition(pos);
    setManualLat(lat.toFixed(6));
    setManualLng(lng.toFixed(6));
    onChange({ lat, lng });
  }

  // When coords change externally (e.g. from address autocomplete), move the map + marker.
  useEffect(() => {
    if (!mapInstance.current || !markerRef.current) return;
    if (value?.lat == null || value?.lng == null) return;
    const pos = { lat: value.lat, lng: value.lng };
    mapInstance.current.setCenter(pos);
    mapInstance.current.setZoom(15);
    markerRef.current.setPosition(pos);
    setManualLat(value.lat.toFixed(6));
    setManualLng(value.lng.toFixed(6));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.lat, value?.lng]);

  function handleManualSubmit(e) {
    e.preventDefault();
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (mapInstance.current && markerRef.current) {
      const pos = { lat, lng };
      mapInstance.current.setCenter(pos);
      markerRef.current.setPosition(pos);
    }
    onChange({ lat, lng });
  }

  return (
    <div className="space-y-2">
      <Label>Pin the exact location on the map</Label>
      <div className="relative overflow-hidden rounded-lg border border-border bg-secondary">
        <div ref={mapRef} className="h-72 w-full" />
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary/80 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Loading map…
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-secondary/80 p-4 text-center text-sm text-muted-foreground">
            <MapPin className="size-6" />
            {error}
          </div>
        )}
      </div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Crosshair className="size-3.5" />
        Click the map or drag the pin to drop the exact location.
      </p>
      <form
        onSubmit={handleManualSubmit}
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <Label>Latitude</Label>
          <Input
            type="number"
            step="any"
            placeholder="6.4541"
            value={manualLat}
            onChange={(e) => setManualLat(e.target.value)}
          />
        </div>
        <div className="flex-1">
          <Label>Longitude</Label>
          <Input
            type="number"
            step="any"
            placeholder="3.3947"
            value={manualLng}
            onChange={(e) => setManualLng(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" className="sm:mb-0.5">
          Set pin
        </Button>
      </form>
      {value?.lat != null && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-green-600">
          <CheckCircle2 className="size-3.5" />
          Saved: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
}

/* ---------- Address Autocomplete using Google Places ---------- */
let placesScriptLoading = null;

function loadGooglePlacesScript(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve();
  if (placesScriptLoading) return placesScriptLoading;
  placesScriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      placesScriptLoading = null;
      reject(new Error("Failed to load Google Maps."));
    };
    document.head.appendChild(script);
  });
  return placesScriptLoading;
}

export function AddressAutocomplete({ value, onChange, onPlaceSelect }) {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let cancelled = false;

    loadGooglePlacesScript(apiKey)
      .then(() => {
        if (cancelled || !inputRef.current) return;
        autocompleteRef.current =
          new window.google.maps.places.Autocomplete(inputRef.current, {
            types: ["address"],
            componentRestrictions: { country: "ng" },
          });

        const listener =
          window.google.maps.event.addListener(
            autocompleteRef.current,
            "place_changed",
            () => {
              const place = autocompleteRef.current.getPlace();
              if (!place || !place.geometry) return;
              onChange(place.formatted_address || place.name || "");
              if (onPlaceSelect) {
                onPlaceSelect({
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng(),
                  address: place.formatted_address || place.name || "",
                });
              }
            }
          );

        return () => {
          if (autocompleteRef.current && listener) {
            window.google.maps.event.removeListener(listener);
          }
        };
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  return (
    <div className="space-y-2">
      <Label>Property address</Label>
      <input
        ref={inputRef}
        type="text"
        placeholder="Property address"
        defaultValue={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        autoComplete="off"
      />
      {!apiKey && (
        <p className="text-xs text-amber-600">
          Set VITE_GOOGLE_MAPS_API_KEY in .env to enable Google Places autocomplete.
        </p>
      )}
    </div>
  );
}

/* ---------- Image Upload: instant capture + room categorization ---------- */
const PHOTO_CATEGORIES = [
  "Front View",
  "Living Room",
  "Kitchen",
  "Bedroom",
  "Bathroom",
  "Toilet",
  "Other",
];

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function compressImage(file, maxW = 1920) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxW) {
          height = Math.round((height * maxW) / width);
          width = maxW;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          0.82
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function validateFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Only JPG, PNG, and WEBP files are allowed.";
  if (file.size > MAX_FILE_SIZE)
    return "Each image must be under 5MB.";
  return null;
}

export function ImageUploader({ images, setImages, userId, tempPropertyId }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [pendingFiles, setPendingFiles] = useState(null);
  const [pendingCategory, setPendingCategory] = useState("Other");
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const MIN = 1;
  const MAX = 10;

  async function uploadToSupabase(file, category) {
    const compressed = await compressImage(file);
    const safeCat = category.toLowerCase().replace(/\s+/g, "-");
    const path = `${userId}/${tempPropertyId}/${safeCat}_${Date.now()}.jpg`;
    const { error } = await supabase.storage
      .from(PROPERTY_BUCKET)
      .upload(path, compressed, {
        upsert: false,
        contentType: "image/jpeg",
      });
    if (error) throw error;
    const { data: pub } = supabase.storage
      .from(PROPERTY_BUCKET)
      .getPublicUrl(path);
    return { url: pub.publicUrl, path };
  }

  function handleFilesSelected(fileList) {
    setError("");
    const incoming = Array.from(fileList);
    const valid = [];
    for (const file of incoming) {
      const err = validateFile(file);
      if (err) {
        setError(err);
        continue;
      }
      valid.push(file);
    }
    if (!valid.length) return;
    if (images.length + valid.length > MAX) {
      setError(`You can upload a maximum of ${MAX} images.`);
      return;
    }
    setPendingFiles(valid);
    setPendingCategory("Other");
  }

  async function confirmCategoryUpload() {
    if (!pendingFiles) return;
    const category = pendingCategory;
    const files = pendingFiles;
    setPendingFiles(null);

    for (const file of files) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      const newImg = {
        id,
        file,
        url: previewUrl,
        category,
        status: "uploading",
        progress: 0,
        storagePath: null,
      };
      setImages((prev) => [...prev, newImg]);

      try {
        const progressInterval = setInterval(() => {
          setImages((prev) =>
            prev.map((p) =>
              p.id === id && p.progress < 90
                ? { ...p, progress: p.progress + 10 }
                : p
            )
          );
        }, 150);

        const result = await uploadToSupabase(file, category);

        clearInterval(progressInterval);
        setImages((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "done",
                  progress: 100,
                  url: result.url,
                  storagePath: result.path,
                }
              : p
          )
        );
      } catch (err) {
        setImages((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status: "error", progress: 0 } : p
          )
        );
        setError("Upload failed: " + (err.message || "Unknown error"));
      }
    }
  }

  function cancelCategoryModal() {
    setPendingFiles(null);
  }

  async function removeImage(id) {
    const img = images.find((p) => p.id === id);
    if (img?.storagePath) {
      try {
        await supabase.storage.from(PROPERTY_BUCKET).remove([img.storagePath]);
      } catch {
        // best-effort delete
      }
    }
    if (img?.url?.startsWith("blob:")) URL.revokeObjectURL(img.url);
    setImages((prev) => prev.filter((p) => p.id !== id));
  }

  function setCover(id) {
    setImages((prev) => {
      const idx = prev.findIndex((p) => p.id === id);
      if (idx === -1) return prev;
      const item = prev[idx];
      return [item, ...prev.filter((p) => p.id !== id)];
    });
  }

  function handleDragStart(id) {
    setDraggedId(id);
  }
  function handleDragOverItem(e, overId) {
    e.preventDefault();
    setDragOverId(overId);
  }
  function handleDropItem(e, overId) {
    e.preventDefault();
    if (!draggedId || draggedId === overId) return;
    setImages((prev) => {
      const fromIdx = prev.findIndex((p) => p.id === draggedId);
      const toIdx = prev.findIndex((p) => p.id === overId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDraggedId(null);
    setDragOverId(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFilesSelected(e.dataTransfer.files);
  }
  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }
  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  // Group images by category for display, preserving order
  const grouped = PHOTO_CATEGORIES.map((cat) => ({
    category: cat,
    items: images.filter((img) => img.category === cat),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {/* Counter */}
      <div className="flex items-center justify-between">
        <Label>
          {images.length}/{MAX} photos uploaded
        </Label>
        {images.length < MIN && (
          <span className="text-xs text-amber-600">At least 1 required</span>
        )}
      </div>

      {/* Action buttons above drag-drop */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={images.length >= MAX}
        >
          <Camera className="size-4" /> Take Photo
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => galleryInputRef.current?.click()}
          disabled={images.length >= MAX}
        >
          <Images className="size-4" /> Upload from Gallery
        </Button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFilesSelected(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Drag & drop area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-secondary/40"
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Drag & drop images here</p>
        <p className="text-xs text-muted-foreground">
          JPG, PNG, WEBP — max 5MB each
        </p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {/* Grouped photo grid */}
      {images.length > 0 && (
        <div className="space-y-4">
          {grouped.map(({ category, items }) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {category} ({items.length})
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {items.map((img) => {
                  const globalIdx = images.findIndex((p) => p.id === img.id);
                  const isCover = globalIdx === 0;
                  return (
                    <div
                      key={img.id}
                      draggable={img.status === "done"}
                      onDragStart={() => handleDragStart(img.id)}
                      onDragOver={(e) => handleDragOverItem(e, img.id)}
                      onDrop={(e) => handleDropItem(e, img.id)}
                      onDragEnd={() => {
                        setDraggedId(null);
                        setDragOverId(null);
                      }}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-md border bg-secondary/20 transition",
                        draggedId === img.id && "opacity-50",
                        dragOverId === img.id
                          ? "border-primary ring-2 ring-primary/40"
                          : "border-border"
                      )}
                    >
                      <img
                        src={img.url}
                        alt={img.category}
                        className="size-full object-cover"
                      />

                      {/* Cover badge */}
                      {isCover && (
                        <span className="absolute left-1 top-1 flex items-center gap-0.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                          <Star className="size-2.5 fill-current" /> Cover
                        </span>
                      )}

                      {/* Category tag */}
                      <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {img.category}
                      </span>

                      {/* Upload progress overlay */}
                      {img.status === "uploading" && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                          <Loader2 className="size-5 animate-spin text-white" />
                          <div className="h-1.5 w-3/4 overflow-hidden rounded-full bg-white/30">
                            <div
                              className="h-full rounded-full bg-white transition-all"
                              style={{ width: `${img.progress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-white">
                            {img.progress}%
                          </span>
                        </div>
                      )}

                      {/* Uploaded indicator */}
                      {img.status === "done" && (
                        <span className="absolute right-1 top-1 flex items-center gap-0.5 rounded bg-green-600 px-1 py-0.5 text-[9px] font-semibold text-white shadow">
                          <CheckIcon className="size-2.5" /> Uploaded
                        </span>
                      )}

                      {/* Error indicator */}
                      {img.status === "error" && (
                        <span className="absolute right-1 top-1 rounded bg-red-600 px-1 py-0.5 text-[9px] font-semibold text-white shadow">
                          Failed
                        </span>
                      )}

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="absolute right-1 bottom-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <X className="size-3.5" />
                      </button>

                      {/* Set as cover button (non-cover images only) */}
                      {!isCover && img.status === "done" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCover(img.id);
                          }}
                          className="absolute left-1 bottom-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                          aria-label="Set as cover"
                          title="Set as cover"
                        >
                          <Star className="size-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <ImageIcon className="size-3.5" />
          Please upload at least 1 photo.
        </p>
      )}

      {/* Category selection modal */}
      {pendingFiles && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl bg-background p-5 shadow-xl">
            <h3 className="text-base font-semibold">Which room is this?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {pendingFiles.length} photo{pendingFiles.length > 1 ? "s" : ""} to
              upload
            </p>
            <div className="mt-4 space-y-2">
              {PHOTO_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setPendingCategory(cat)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-medium transition",
                    pendingCategory === cat
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:bg-secondary"
                  )}
                >
                  {cat}
                  {pendingCategory === cat && (
                    <CheckIcon className="size-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={cancelCategoryModal}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                onClick={confirmCategoryUpload}
              >
                Upload
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Upgraded Add Property Modal ---------- */
export function AddPropertyModal({ open, onClose, onSubmit }) {
  const [title, setTitle] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [owner, setOwner] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [coords, setCoords] = useState(null);
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  function reset() {
    setTitle("");
    setPropertyType("");
    setAddress("");
    setPrice("");
    setDescription("");
    setOwner("");
    setWhatsapp("");
    setCoords(null);
    setImages([]);
    setFormError("");
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    if (!title.trim()) return setFormError("Please enter a title.");
    if (!propertyType) return setFormError("Please select a property type.");
    if (!address.trim()) return setFormError("Please enter the property address.");
    if (!price.trim()) return setFormError("Please enter a price.");
    if (images.length < 5)
      return setFormError("Please upload at least 5 images of the property.");
    setSubmitting(true);
    const entry = {
      title: title.trim(),
      propertyType,
      location: address.trim(),
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      price: price.trim(),
      description: description.trim(),
      owner: owner.trim(),
      whatsapp: whatsapp.trim(),
      image: images[0]?.url || "",
      images: images.map((i) => i.url),
    };
    setTimeout(() => {
      setSubmitting(false);
      reset();
      onSubmit(entry);
    }, 500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-background shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-bold">List your property</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground transition hover:bg-secondary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <form
          onSubmit={handleSubmit}
          className="flex-1 space-y-5 overflow-y-auto px-5 py-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="e.g. 4-Bedroom Duplex"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Property Type</Label>
              <Select
                id="type"
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
              >
                <option value="">Select type…</option>
                {propertyTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <AddressAutocomplete
            value={address}
            onChange={setAddress}
            onPlaceSelect={(place) => setCoords({ lat: place.lat, lng: place.lng })}
          />

          <MapPicker value={coords} onChange={setCoords} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                type="text"
                inputMode="numeric"
                placeholder="e.g. 85,000,000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="whatsapp">WhatsApp number</Label>
              <Input
                id="whatsapp"
                placeholder="+234 800 000 0000"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="owner">Owner name</Label>
            <Input
              id="owner"
              placeholder="Full name"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              rows={3}
              placeholder="Describe the property, neighbourhood, and amenities…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <ImageUploader images={images} setImages={setImages} />

          {formError && (
            <p className="text-sm font-medium text-red-600">{formError}</p>
          )}

          <div className="flex items-center gap-2 rounded-lg bg-secondary/60 p-3 text-xs text-muted-foreground">
            <Badge className="bg-green-50 text-green-700 ring-1 ring-green-200">
              <CheckCircle2 className="size-3.5" /> Verified
            </Badge>
            Listings with complete details, a pinned location, and 5+ photos get
            verified faster and appear higher in search.
          </div>
        </form>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Submitting…
              </>
            ) : (
              "Submit listing"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
