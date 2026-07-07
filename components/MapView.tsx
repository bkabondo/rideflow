'use client'

import { useEffect, useRef } from 'react'
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api'

export interface GeoPoint { lat: number; lng: number; label: string }

interface MapViewProps {
  pickup: GeoPoint | null
  dropoff: GeoPoint | null
  isLoaded: boolean
}

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry',             stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.icon',          stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill',     stylers: [{ color: '#888888' }] },
  { elementType: 'labels.text.stroke',   stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#bbbbbb' }] },
  { featureType: 'poi',                  stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park',             elementType: 'geometry', stylers: [{ color: '#161616' }] },
  { featureType: 'road',                 elementType: 'geometry.fill', stylers: [{ color: '#2c2c2c' }] },
  { featureType: 'road',                 elementType: 'geometry.stroke', stylers: [{ color: '#1f1f1f' }] },
  { featureType: 'road',                 elementType: 'labels.text.fill', stylers: [{ color: '#777777' }] },
  { featureType: 'road.arterial',        elementType: 'geometry', stylers: [{ color: '#333333' }] },
  { featureType: 'road.highway',         elementType: 'geometry', stylers: [{ color: '#3c3c3c' }] },
  { featureType: 'road.highway',         elementType: 'labels.text.fill', stylers: [{ color: '#C9A028' }] },
  { featureType: 'transit',              stylers: [{ visibility: 'off' }] },
  { featureType: 'water',               elementType: 'geometry', stylers: [{ color: '#050505' }] },
  { featureType: 'water',               elementType: 'labels.text.fill', stylers: [{ color: '#3d3d3d' }] },
]

const MAP_OPTIONS: google.maps.MapOptions = {
  styles: DARK_STYLE,
  disableDefaultUI: true,
  zoomControl: true,
  zoomControlOptions: { position: 3 },
  clickableIcons: false,
  backgroundColor: '#1a1a1a',
}

const DEFAULT_CENTER = { lat: 39.8283, lng: -98.5795 }
const POLYLINE_OPTS: google.maps.PolylineOptions = {
  strokeColor: '#C9A028',
  strokeOpacity: 0.9,
  strokeWeight: 3,
  geodesic: true,
}

function goldIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#C9A028',
    fillOpacity: 1,
    strokeColor: '#F5F0E8',
    strokeWeight: 2.5,
    scale: 9,
  }
}

function dropoffIcon(): google.maps.Symbol {
  return {
    path: google.maps.SymbolPath.CIRCLE,
    fillColor: '#ef4444',
    fillOpacity: 1,
    strokeColor: '#F5F0E8',
    strokeWeight: 2.5,
    scale: 9,
  }
}

export default function MapView({ pickup, dropoff, isLoaded }: MapViewProps) {
  const mapRef = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current) return
    if (pickup && dropoff) {
      const bounds = new google.maps.LatLngBounds()
      bounds.extend(pickup)
      bounds.extend(dropoff)
      mapRef.current.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 })
    } else if (pickup) {
      mapRef.current.panTo(pickup)
      mapRef.current.setZoom(14)
    } else if (dropoff) {
      mapRef.current.panTo(dropoff)
      mapRef.current.setZoom(14)
    }
  }, [pickup, dropoff])

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-[#141414] flex flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 border-2 border-[#C9A028] border-t-transparent rounded-full animate-spin" />
        <p className="text-[#666] text-sm">Loading map…</p>
      </div>
    )
  }

  const noKey = !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={pickup ?? dropoff ?? DEFAULT_CENTER}
        zoom={pickup || dropoff ? 14 : 4}
        options={MAP_OPTIONS}
        onLoad={map => { mapRef.current = map }}
      >
        {pickup && <Marker position={pickup} icon={goldIcon()} title="Pickup" />}
        {dropoff && <Marker position={dropoff} icon={dropoffIcon()} title="Drop-off" />}
        {pickup && dropoff && (
          <Polyline path={[pickup, dropoff]} options={POLYLINE_OPTS} />
        )}
      </GoogleMap>

      {/* Legend */}
      {(pickup || dropoff) && (
        <div className="absolute bottom-4 left-4 bg-[#111]/90 backdrop-blur-sm border border-[#2A2A2A] rounded-xl px-4 py-2.5 space-y-1.5 pointer-events-none">
          {pickup && (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-[#C9A028] border border-white/30" />
              <span className="text-[#C9A028] text-xs font-medium">Pickup</span>
            </div>
          )}
          {dropoff && (
            <div className="flex items-center gap-2">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500 border border-white/30" />
              <span className="text-red-400 text-xs font-medium">Drop-off</span>
            </div>
          )}
        </div>
      )}

      {/* No API key notice */}
      {noKey && (
        <div className="absolute inset-0 bg-[#0A0A0A]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center px-6">
          <div className="text-3xl">🗺️</div>
          <p className="text-[#C9A028] font-semibold text-sm">Google Maps API Key Required</p>
          <p className="text-[#666] text-xs max-w-xs">Add <code className="text-[#999] bg-[#1A1A1A] px-1.5 py-0.5 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to your environment variables to enable the map.</p>
        </div>
      )}
    </div>
  )
}
