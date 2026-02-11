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

    addChoroplethLayer(geojson, fieldOrOptions = {}, extraOptions) {
        // Support both calling conventions:
        //   addChoroplethLayer(geojson, { valueField, colorScale, ... })
        //   addChoroplethLayer(geojson, 'fieldName', { colors, breaks, fillOpacity })
        let options;
        if (typeof fieldOrOptions === 'string') {
            options = { valueField: fieldOrOptions, ...(extraOptions || {}) };
        } else {
            options = fieldOrOptions;
        }

        const {
            valueField = 'error_pct',
            layerName = 'choropleth',
            colorScale = null,
            colors = null,
            breaks = null,
            fillOpacity = 0.7,
            onEachFeature = null,
            style = null,
            popupFields = null
        } = options;

        // Build color function: use colors/breaks if provided, otherwise colorScale
        const getColorForValue = (value) => {
            if (colors && breaks) {
                if (value === null || value === undefined) return '#c7c7cc';
                for (let i = 0; i < breaks.length; i++) {
                    if (value <= breaks[i]) return colors[i] || colors[colors.length - 1];
                }
                return colors[colors.length - 1];
            }
            return this.getColor(value, colorScale || this.getDefaultColorScale());
        };

        const defaultStyle = (feature) => {
            const value = feature.properties[valueField];
            return {
                fillColor: getColorForValue(value),
                weight: 1,
                opacity: 1,
                color: '#ffffff',
                fillOpacity: fillOpacity
            };
        };

        const layer = L.geoJSON(geojson, {
            style: style || defaultStyle,
            onEachFeature: onEachFeature || ((feature, layer) => {
                const props = feature.properties;
                const income = (props.median_income || props.median_income_y);

                const lines = [`<strong>Census Tract ${props.tract_id}</strong>`];
                if (popupFields) {
                    popupFields.forEach(({ label, field, format }) => {
                        const val = props[field];
                        if (val == null) return;
                        lines.push(`<strong>${label}:</strong> ${format ? format(val) : val}`);
                    });
                } else {
                    lines.push(`<strong>Median Income:</strong> $${income?.toLocaleString() || 'N/A'}`);
                    if (props.pct_minority != null) lines.push(`<strong>Minority %:</strong> ${props.pct_minority.toFixed(1)}%`);
                    lines.push(`<strong>AI Error:</strong> ${props[valueField]?.toFixed?.(1) ?? props[valueField] ?? 'N/A'}%`);
                }

                layer.bindPopup(`<div style="font-size: 13px;">${lines.join('<br/>')}</div>`);

                layer.on('mouseover', function() {
                    this.setStyle({
                        weight: 3,
                        color: '#636366'
                    });
                });

                layer.on('mouseout', function() {
                    this.setStyle({
                        weight: 1,
                        color: '#ffffff'
                    });
                });
            })
        }).addTo(this.map);

        this.layers[layerName] = layer;
        this.choroplethLayer = layer;

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
            return '#c7c7cc';  // Gray for no data
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
            { max: -20, color: '#b35806', label: '< -20% (severe undercount)' },
            { max: -10, color: '#f1a340', label: '-20% to -10%' },
            { max: -5, color: '#fee0b6', label: '-10% to -5%' },
            { max: 5, color: '#d8daeb', label: '-5% to +5% (accurate)' },
            { max: 10, color: '#998ec3', label: '+5% to +10%' },
            { max: Infinity, color: '#542788', label: '> +10% (overcount)' }
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
