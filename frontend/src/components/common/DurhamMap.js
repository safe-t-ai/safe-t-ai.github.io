/**
 * Reusable Durham map component using Leaflet.js
 */

export class DurhamMap {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.options = {
            center: [36.0, -78.9],
            zoom: 11,
            ...options
        };

        this.map = null;
        this.layers = {};
    }

    initialize() {
        this.map = L.map(this.containerId).setView(
            this.options.center,
            this.options.zoom
        );

        // Base tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 18
        }).addTo(this.map);

        return this;
    }

    addChoroplethLayer(geojson, options = {}) {
        const {
            valueField = 'error_pct',
            layerName = 'choropleth',
            colorScale = this.getDefaultColorScale(),
            onEachFeature = null,
            style = null
        } = options;

        const defaultStyle = (feature) => {
            const value = feature.properties[valueField];
            const color = this.getColor(value, colorScale);

            return {
                fillColor: color,
                weight: 1,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: 0.7
            };
        };

        const layer = L.geoJSON(geojson, {
            style: style || defaultStyle,
            onEachFeature: onEachFeature || ((feature, layer) => {
                const props = feature.properties;

                const popupContent = `
                    <div style="font-size: 13px;">
                        <strong>Census Tract ${props.tract_id}</strong><br/>
                        <strong>Median Income:</strong> $${props.median_income?.toLocaleString() || 'N/A'}<br/>
                        <strong>Minority %:</strong> ${props.pct_minority?.toFixed(1) || 'N/A'}%<br/>
                        <strong>AI Error:</strong> ${props[valueField]?.toFixed(1) || '0'}%
                    </div>
                `;

                layer.bindPopup(popupContent);

                layer.on('mouseover', function(e) {
                    this.setStyle({
                        weight: 3,
                        color: '#666'
                    });
                });

                layer.on('mouseout', function(e) {
                    this.setStyle({
                        weight: 1,
                        color: '#ffffff'
                    });
                });
            })
        }).addTo(this.map);

        this.layers[layerName] = layer;

        return this;
    }

    addMarkers(points, options = {}) {
        const {
            layerName = 'markers',
            icon = null,
            popupContent = null
        } = options;

        const markers = [];

        points.forEach(point => {
            const marker = L.marker([point.lat, point.lon], { icon });

            if (popupContent) {
                marker.bindPopup(popupContent(point));
            } else {
                marker.bindPopup(`
                    <div style="font-size: 13px;">
                        <strong>${point.counter_id}</strong><br/>
                        Daily Volume: ${point.daily_volume}
                    </div>
                `);
            }

            markers.push(marker);
        });

        const layerGroup = L.layerGroup(markers).addTo(this.map);
        this.layers[layerName] = layerGroup;

        return this;
    }

    addLegend(options = {}) {
        const {
            position = 'bottomright',
            title = 'AI Prediction Error',
            colorScale = this.getDefaultColorScale()
        } = options;

        const legend = L.control({ position });

        legend.onAdd = () => {
            const div = L.DomUtil.create('div', 'legend');

            div.innerHTML = `<h4>${title}</h4>`;

            colorScale.forEach(item => {
                div.innerHTML += `
                    <div class="legend-item">
                        <span class="legend-color" style="background: ${item.color}"></span>
                        <span>${item.label}</span>
                    </div>
                `;
            });

            return div;
        };

        legend.addTo(this.map);

        return this;
    }

    getColor(value, colorScale) {
        if (value === null || value === undefined) {
            return '#cbd5e0';  // Gray for no data
        }

        for (let i = 0; i < colorScale.length; i++) {
            if (value <= colorScale[i].max) {
                return colorScale[i].color;
            }
        }

        return colorScale[colorScale.length - 1].color;
    }

    getDefaultColorScale() {
        return [
            { max: -20, color: '#e53e3e', label: '< -20% (severe undercount)' },
            { max: -10, color: '#ed8936', label: '-20% to -10%' },
            { max: -5, color: '#ecc94b', label: '-10% to -5%' },
            { max: 5, color: '#48bb78', label: '-5% to +5% (accurate)' },
            { max: 10, color: '#38a169', label: '+5% to +10%' },
            { max: Infinity, color: '#2f855a', label: '> +10% (overcount)' }
        ];
    }

    removeLayer(layerName) {
        if (this.layers[layerName]) {
            this.map.removeLayer(this.layers[layerName]);
            delete this.layers[layerName];
        }
        return this;
    }

    fitBounds(geojson) {
        const layer = L.geoJSON(geojson);
        this.map.fitBounds(layer.getBounds());
        return this;
    }

    invalidateSize() {
        if (this.map) {
            this.map.invalidateSize();
        }
        return this;
    }

    cleanup() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.layers = {};
    }
}
