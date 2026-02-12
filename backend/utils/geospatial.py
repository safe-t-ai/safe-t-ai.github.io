"""
Geospatial utility functions for processing Durham GeoJSON data
"""

import json
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point

def geojson_to_dict(gdf):
    """Convert GeoDataFrame to GeoJSON dict"""
    return json.loads(gdf.to_json())

def simplify_geometry(gdf, tolerance=0.001):
    """Simplify geometries for faster frontend rendering"""
    gdf['geometry'] = gdf['geometry'].simplify(tolerance)
    return gdf

def calculate_centroid(geometry):
    """Calculate centroid of a geometry"""
    centroid = geometry.centroid
    return {'lat': centroid.y, 'lon': centroid.x}

def point_in_tract(point_lon, point_lat, tracts_gdf):
    """Find which census tract a point falls in"""
    point = Point(point_lon, point_lat)

    for _, tract in tracts_gdf.iterrows():
        if tract.geometry.contains(point):
            return tract

    return None

def create_choropleth_data(gdf, value_column, id_column='tract_id'):
    """
    Create data structure for choropleth maps

    Returns:
        List of {id, value, properties} for each feature
    """
    data = []

    for _, row in gdf.iterrows():
        feature = {
            'id': row[id_column],
            'value': float(row[value_column]) if pd.notna(row[value_column]) else None,
            'properties': {
                key: (float(val) if isinstance(val, (int, float)) and pd.notna(val)
                      else str(val) if pd.notna(val) else None)
                for key, val in row.items()
                if key not in ['geometry', id_column]
            }
        }
        data.append(feature)

    return data

def calculate_area_demographics(gdf, weight_column='total_population'):
    """
    Calculate population-weighted demographic statistics

    Returns summary stats weighted by population
    """
    if len(gdf) == 0:
        return None

    total_pop = gdf[weight_column].sum()

    if total_pop == 0:
        return None

    weighted_income = np.average(gdf['median_income'],
                                  weights=gdf[weight_column])

    weighted_minority_pct = np.average(gdf['pct_minority'],
                                        weights=gdf[weight_column])

    return {
        'total_population': int(total_pop),
        'weighted_median_income': float(weighted_income),
        'weighted_minority_pct': float(weighted_minority_pct),
        'num_tracts': len(gdf),
    }
