import { useEffect, useRef, useState } from "react";
import { MapPin, Search, CloudUpload as UploadCloud, X, Image as ImageIcon, Loader as Loader2, Crosshair, CircleCheck as CheckCircle2, Camera } from "lucide-react";
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
export function AddressAutocomplete({ value, onChange, onPlaceSelect }) {
  const inputRef = useRef(null);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  useEffect(() => {
    if (!apiKey || !value || value.length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const url =
          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
            value
          )}&components=country:ng&key=${apiKey}`;
        // Google Places Autocomplete (REST) is not usable from the browser due to CORS.
        // Fallback: use the JS SDK Autocomplete widget if loaded.
        if (window.google?.maps?.places) {
          const service =
            new window.google.maps.places.AutocompleteService();
          service.getPlacePredictions(
            { input: value, componentRestrictions: { country: "ng" } },
            (preds, status) => {
              setLoading(false);
              if (
                status !== window.google.maps.places.PlacesServiceStatus.OK ||
                !preds
              ) {
                setSuggestions([]);
                return;
              }
              setSuggestions(preds.slice(0, 6));
              setActiveIndex(-1);
            }
          );
        } else {
          // Pretend REST call (CORS-blocked in browser) — surface a helpful note.
          setLoading(false);
          setSuggestions([]);
        }
      } catch {
        setLoading(false);
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, apiKey]);

  function selectPlace(pred) {
    onChange(pred.description);
    setSuggestions([]);
    if (!onPlaceSelect) return;
    if (window.google?.maps?.places) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ placeId: pred.place_id }, (results, status) => {
        if (status === window.google.maps.GeocoderStatus.OK && results[0]) {
          const loc = results[0].geometry.location;
          onPlaceSelect({
            lat: loc.lat(),
            lng: loc.lng(),
            address: pred.description,
          });
        }
      });
    }
  }

  function handleKey(e) {
    if (!suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      selectPlace(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setSuggestions([]);
    }
  }

  return (
    <div className="space-y-2">
      <Label>Property address</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Start typing an address in Nigeria"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          className="pl-9"
          autoComplete="off"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md border border-border bg-card py-1 shadow-lg">
            {suggestions.map((s, i) => (
              <li
                key={s.place_id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPlace(s);
                }}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                  i === activeIndex ? "bg-secondary" : "hover:bg-secondary"
                )}
              >
                <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                {s.description}
              </li>
            ))}
          </ul>
        )}
      </div>
      {!apiKey && (
        <p className="text-xs text-amber-600">
          Set VITE_GOOGLE_MAPS_API_KEY in .env to enable Google Places autocomplete.
        </p>
      )}
    </div>
  );
}

/* ---------- Image Upload: 5-20 images, drag-drop ---------- */
export function ImageUploader({ images, setImages }) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);
  const cameraRef = useRef(null);

  const MIN = 5;
  const MAX = 20;

  function addFiles(fileList) {
    setError("");
    const incoming = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/")
    );
    if (!incoming.length) {
      setError("Please select image files only.");
      return;
    }
    const next = [...images, ...incoming];
    if (next.length > MAX) {
      setError(`You can upload a maximum of ${MAX} images.`);
      return;
    }
    const withPreviews = next.map((file) => ({
      id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      file,
      url: URL.createObjectURL(file),
    }));
    setImages(withPreviews);
  }

  function removeImage(id) {
    setImages((prev) => {
      const found = prev.find((p) => p.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragging(false);
  }

  return (
    <div className="space-y-2">
      <Label>
        Property photos{" "}
        <span className="font-normal text-muted-foreground">
          ({images.length}/{MAX}, minimum {MIN})
        </span>
      </Label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition",
          dragging
            ? "border-primary bg-primary/5"
            : "border-border bg-secondary/40 hover:border-primary/50"
        )}
      >
        <UploadCloud className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drag & drop images here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">
          Upload {MIN}-{MAX} images (JPG, PNG, WebP)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={(e) => {
            e.stopPropagation();
            cameraRef.current?.click();
          }}
        >
          <Camera className="size-4" /> Take Photo
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-md border border-border"
            >
              <img
                src={img.url}
                alt="preview"
                className="size-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(img.id);
                }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {images.length > 0 && images.length < MIN && (
        <p className="flex items-center gap-1.5 text-xs text-amber-600">
          <ImageIcon className="size-3.5" />
          Add at least {MIN - images.length} more image(s) to continue.
        </p>
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