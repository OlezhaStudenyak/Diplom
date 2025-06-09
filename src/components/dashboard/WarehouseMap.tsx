import React, { useEffect, useState, useRef } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import { Warehouse as WarehouseIcon } from 'lucide-react';
import Card from '../ui/Card';
import { Warehouse } from '../../types';
import Button from '../ui/Button';
import 'mapbox-gl/dist/mapbox-gl.css';

interface WarehouseMapProps {
  warehouses: Warehouse[];
  loading?: boolean;
}

const WarehouseMap: React.FC<WarehouseMapProps> = ({ warehouses, loading = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  
  const [viewport, setViewport] = useState({
    latitude: 49.0384,  // Center of Ukraine
    longitude: 31.4513, // Center of Ukraine
    zoom: 6
  });

  useEffect(() => {
    if (warehouses.length > 0) {
      const avgLat = warehouses.reduce((sum, w) => sum + Number(w.latitude), 0) / warehouses.length;
      const avgLng = warehouses.reduce((sum, w) => sum + Number(w.longitude), 0) / warehouses.length;
      
      setViewport({
        latitude: avgLat,
        longitude: avgLng,
        zoom: 6
      });
    }
  }, [warehouses]);

  useEffect(() => {
    if (mapContainerRef.current) {
      setMapReady(true);
    }
  }, []);

  if (loading) {
    return (
      <Card title="Розташування складів\" className="mt-6 animate-pulse">
        <div className="h-96 bg-neutral-100 rounded"></div>
      </Card>
    );
  }

  return (
    <Card title="Розташування складів" className="mt-6">
      <div ref={mapContainerRef} className="h-96">
        {mapReady && (
          <Map
            mapboxAccessToken={import.meta.env.VITE_MAPBOX_ACCESS_TOKEN}
            initialViewState={viewport}
            mapStyle="mapbox://styles/mapbox/light-v10"
            style={{ width: '100%', height: '100%', borderRadius: '0.375rem' }}
          >
            {warehouses.map((warehouse) => (
              <Marker
                key={warehouse.id}
                longitude={Number(warehouse.longitude)}
                latitude={Number(warehouse.latitude)}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedWarehouse(warehouse);
                }}
              >
                <div className="bg-primary-600 p-1 rounded-md shadow-md cursor-pointer hover:bg-primary-700 transition-colors">
                  <WarehouseIcon size={16} className="text-white" />
                </div>
              </Marker>
            ))}
            
            {selectedWarehouse && (
              <Popup
                longitude={Number(selectedWarehouse.longitude)}
                latitude={Number(selectedWarehouse.latitude)}
                anchor="top"
                onClose={() => setSelectedWarehouse(null)}
                closeButton={true}
                closeOnClick={false}
              >
                <div className="p-2">
                  <h3 className="font-semibold text-neutral-800">{selectedWarehouse.name}</h3>
                  <p className="text-neutral-600 text-sm my-1">
                    {selectedWarehouse.address}, {selectedWarehouse.city}
                  </p>
                  <p className="text-neutral-600 text-sm mb-2">
                    Місткість: {selectedWarehouse.total_capacity} одиниць
                  </p>
                  <Button size="sm" variant="primary" fullWidth>
                    Детальніше
                  </Button>
                </div>
              </Popup>
            )}
          </Map>
        )}
      </div>
    </Card>
  );
};

export default WarehouseMap;