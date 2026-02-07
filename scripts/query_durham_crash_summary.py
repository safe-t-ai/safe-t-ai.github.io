#!/usr/bin/env python3
"""
Query Durham County crash summary statistics from NC Vision Zero Power BI API.
"""

import requests
import json
import pandas as pd
from datetime import datetime

POWERBI_API = "https://wabi-us-east2-c-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true"

def query_durham_summary_by_year():
    """Get Durham County crash counts by year (2019-2023)."""

    # Query for aggregated counts by year
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
                                    "Select": [
                                        {
                                            "Column": {
                                                "Expression": {
                                                    "SourceRef": {"Source": "c"}
                                                },
                                                "Property": "CNTY_NM"
                                            },
                                            "Name": "County"
                                        },
                                        {
                                            "Measure": {
                                                "Expression": {
                                                    "SourceRef": {"Source": "c"}
                                                },
                                                "Property": "CRASH_DATE"
                                            },
                                            "Name": "Year"
                                        },
                                        {
                                            "Aggregation": {
                                                "Expression": {
                                                    "Column": {
                                                        "Expression": {
                                                            "SourceRef": {"Source": "c"}
                                                        },
                                                        "Property": "CRASH_DATE"
                                                    }
                                                },
                                                "Function": 3  # COUNT
                                            },
                                            "Name": "CrashCount"
                                        }
                                    ],
                                    "Where": [
                                        {
                                            "Condition": {
                                                "In": {
                                                    "Expressions": [
                                                        {
                                                            "Column": {
                                                                "Expression": {
                                                                    "SourceRef": {"Source": "c"}
                                                                },
                                                                "Property": "CNTY_NM"
                                                            }
                                                        }
                                                    ],
                                                    "Values": [
                                                        [{"Literal": {"Value": "'DURHAM'"}}]
                                                    ]
                                                }
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    ]
                },
                "QueryId": "",
                "ApplicationContext": {
                    "DatasetId": "4d0f3aae-2892-40e8-93a3-b7c3df04713c",
                    "Sources": [{"ReportId": "8dd4c4ae-1b7e-4e8f-816e-8d85f432685f"}]
                }
            }
        ],
        "cancelQueries": [],
        "modelId": 3769678
    }

    print("Querying Durham County crash summary...")

    response = requests.post(
        POWERBI_API,
        json=query,
        headers={
            'Content-Type': 'application/json',
            'X-PowerBI-ResourceKey': '8dd4c4ae-1b7e-4e8f-816e-8d85f432685f'
        }
    )

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error {response.status_code}: {response.text}")
        return None

if __name__ == '__main__':
    result = query_durham_summary_by_year()

    if result:
        print(json.dumps(result, indent=2))

        # Parse and display summary
        try:
            dsr = result['results'][0]['result']['data']['dsr']
            print("\n✓ Got summary data!")
            print(f"\nRaw DSR:\n{json.dumps(dsr, indent=2)}")
        except Exception as e:
            print(f"\nParsing error: {e}")
