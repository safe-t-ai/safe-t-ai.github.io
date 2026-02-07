#!/usr/bin/env python3
"""
Fetch real NCDOT crash data from NC Vision Zero Power BI API.

This script queries the Power BI backend that powers ncvisionzero.org
to get actual Durham County crash data.
"""

import requests
import json
import pandas as pd
from pathlib import Path

# Power BI query endpoint
POWERBI_API = "https://wabi-us-east2-c-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true"

def build_query(select_columns, filters=None):
    """
    Build a Power BI semantic query.

    Args:
        select_columns: List of column definitions
        filters: Optional filter conditions

    Returns:
        Query payload dict
    """
    query = {
        "version": "1.0.0",
        "queries": [
            {
                "Query": {
                    "Commands": [
                        {
                            "SemanticQueryDataShapeCommand": {
                                "Query": {
                                    "Version": 2,
                                    "From": [
                                        {
                                            "Name": "c",
                                            "Entity": "CT_ACCIDENT",
                                            "Type": 0
                                        }
                                    ],
                                    "Select": select_columns
                                }
                            }
                        }
                    ]
                },
                "QueryId": "",
                "ApplicationContext": {
                    "DatasetId": "4d0f3aae-2892-40e8-93a3-b7c3df04713c",
                    "Sources": [
                        {
                            "ReportId": "8dd4c4ae-1b7e-4e8f-816e-8d85f432685f"
                        }
                    ]
                }
            }
        ],
        "cancelQueries": [],
        "modelId": 3769678
    }

    # Add filters if provided
    if filters:
        query["queries"][0]["Query"]["Commands"][0]["SemanticQueryDataShapeCommand"]["Query"]["Where"] = filters

    return query

def query_durham_crashes_by_year():
    """Query crash counts by year for Durham County."""

    # Select columns: County, Year, Count
    select_columns = [
        {
            "Column": {
                "Expression": {
                    "SourceRef": {
                        "Source": "c"
                    }
                },
                "Property": "CNTY_NM"
            },
            "Name": "CT_ACCIDENT.CNTY_NM"
        },
        {
            "Column": {
                "Expression": {
                    "SourceRef": {
                        "Source": "c"
                    }
                },
                "Property": "CRASH_DATE"
            },
            "Name": "CT_ACCIDENT.CRASH_DATE"
        }
    ]

    # Filter for Durham County
    filters = [
        {
            "Condition": {
                "In": {
                    "Expressions": [
                        {
                            "Column": {
                                "Expression": {
                                    "SourceRef": {
                                        "Source": "c"
                                    }
                                },
                                "Property": "CNTY_NM"
                            }
                        }
                    ],
                    "Values": [
                        [
                            {
                                "Literal": {
                                    "Value": "'Durham'"
                                }
                            }
                        ]
                    ]
                }
            }
        }
    ]

    query = build_query(select_columns, filters)

    print("Querying Durham County crashes...")
    print(f"Query payload:\n{json.dumps(query, indent=2)}\n")

    response = requests.post(
        POWERBI_API,
        json=query,
        headers={
            'Content-Type': 'application/json',
            'X-PowerBI-ResourceKey': '8dd4c4ae-1b7e-4e8f-816e-8d85f432685f'
        }
    )

    print(f"Response status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print("Success! Response received.")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def parse_powerbi_response(response_data):
    """Parse Power BI query response into DataFrame."""

    try:
        # Navigate to the data section
        results = response_data.get('results', [])
        if not results:
            print("No results found in response")
            return None

        result = results[0].get('result', {})
        dsr = result.get('data', {}).get('dsr', {})

        # Extract data from DSR (Data Shape Response)
        ds = dsr.get('DS', [])
        if not ds:
            print("No DS data found")
            return None

        # Parse the data structure
        print(f"Raw DSR data:\n{json.dumps(dsr, indent=2)}")

        return dsr

    except Exception as e:
        print(f"Error parsing response: {e}")
        return None

def main():
    print("=" * 60)
    print("NCDOT Crash Data Fetch - Power BI API")
    print("=" * 60)

    # Test query
    response = query_durham_crashes_by_year()

    if response:
        print("\nParsing response...")
        data = parse_powerbi_response(response)

        if data:
            print("\n✓ Successfully retrieved data!")

            # Save raw response
            output_file = Path(__file__).parent.parent / 'backend' / 'data' / 'raw' / 'ncdot_powerbi_response.json'
            output_file.parent.mkdir(parents=True, exist_ok=True)

            with open(output_file, 'w') as f:
                json.dump(response, f, indent=2)

            print(f"Saved response to: {output_file}")
    else:
        print("\n✗ Query failed")

if __name__ == '__main__':
    main()
