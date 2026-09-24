### api/vehicles?limit=10
api/vehicles?limit=10
```
{
  "success": true,
  "data": [
    {
      "id": "c9659bc0-79f3-4942-84fe-4d2d1f0c4324",
      "vehicleNumber": "FL-001",
      "driverName": "John Smith",
      "driverPhone": "+15096750557",
      "status": "en_route",
      "destination": "Hotel Downtown",
      "currentLocation": {
        "lat": 37.67793808442565,
        "lng": -122.47539323379097
      },
      "speed": 62,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": "2026-09-24T10:05:08.476Z",
      "batteryLevel": 59,
      "fuelLevel": 61
    },
    {
      "id": "e3e5287e-26ff-4f38-89a1-2d71fc12a93c",
      "vehicleNumber": "FL-002",
      "driverName": "Maria Garcia",
      "driverPhone": "+15850514313",
      "status": "delivered",
      "destination": "Residential Complex A",
      "currentLocation": {
        "lat": 37.824283826737194,
        "lng": -122.47999183543374
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 85,
      "fuelLevel": 62
    },
    {
      "id": "999ad69f-1b91-44b5-9019-b5aac393e747",
      "vehicleNumber": "FL-003",
      "driverName": "David Chen",
      "driverPhone": "+13624692637",
      "status": "en_route",
      "destination": "Shopping Mall West",
      "currentLocation": {
        "lat": 37.73278499596303,
        "lng": -122.3532734059452
      },
      "speed": 26,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": "2026-09-24T09:38:56.036Z",
      "batteryLevel": 70,
      "fuelLevel": 43
    },
    {
      "id": "ac269940-93a9-4df2-a90a-c073405b9b38",
      "vehicleNumber": "FL-004",
      "driverName": "Sarah Johnson",
      "driverPhone": "+19758227654",
      "status": "idle",
      "destination": "Manufacturing Plant",
      "currentLocation": {
        "lat": 37.721277011008645,
        "lng": -122.50295054396629
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 84,
      "fuelLevel": 62
    },
    {
      "id": "11aec2db-9ee9-419c-a523-57a22c6dfa71",
      "vehicleNumber": "FL-005",
      "driverName": "Michael Brown",
      "driverPhone": "+19340842164",
      "status": "idle",
      "destination": "Airport Terminal 1",
      "currentLocation": {
        "lat": 37.742903538489024,
        "lng": -122.33997142803577
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 59,
      "fuelLevel": 34
    },
    {
      "id": "7afa706a-cb75-4507-a05f-262b463f8637",
      "vehicleNumber": "FL-006",
      "driverName": "Lisa Wang",
      "driverPhone": "+13368287830",
      "status": "idle",
      "destination": "Hospital Center",
      "currentLocation": {
        "lat": 37.83729698374356,
        "lng": -122.37922034763204
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 77,
      "fuelLevel": 58
    },
    {
      "id": "2e486106-7fb1-4aea-b1a4-aaef92293b52",
      "vehicleNumber": "FL-007",
      "driverName": "Robert Davis",
      "driverPhone": "+14339279740",
      "status": "idle",
      "destination": "University Campus",
      "currentLocation": {
        "lat": 37.709581600256456,
        "lng": -122.47217961461443
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 57,
      "fuelLevel": 74
    },
    {
      "id": "23208abe-b063-4f44-ac0a-f57ef6eb1107",
      "vehicleNumber": "FL-008",
      "driverName": "Jennifer Wilson",
      "driverPhone": "+19814863907",
      "status": "delivered",
      "destination": "Tech Park North",
      "currentLocation": {
        "lat": 37.746832797041634,
        "lng": -122.5178763742886
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 86,
      "fuelLevel": 70
    },
    {
      "id": "5d8b2e6e-eb5e-4f9b-9c7b-0e0e7503de81",
      "vehicleNumber": "FL-009",
      "driverName": "Carlos Rodriguez",
      "driverPhone": "+11540195573",
      "status": "delivered",
      "destination": "Warehouse District",
      "currentLocation": {
        "lat": 37.84696267246501,
        "lng": -122.50058921030802
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 96,
      "fuelLevel": 42
    },
    {
      "id": "7e071216-5714-4fda-8cb1-76c79afb6b67",
      "vehicleNumber": "FL-010",
      "driverName": "Emily Taylor",
      "driverPhone": "+18532961708",
      "status": "delivered",
      "destination": "Business Center East",
      "currentLocation": {
        "lat": 37.67978173626784,
        "lng": -122.34077193419695
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:49:41.516Z",
      "estimatedArrival": null,
      "batteryLevel": 87,
      "fuelLevel": 62
    }
  ],
  "total": 10,
  "timestamp": "2026-09-24T09:51:33.075Z"
}
```

on 500 error it'll give this
```
{
  "success": false,
  "error": "Vehicle not found",
  "message": "Vehicle with ID abc123 does not exist"
}
```



### /vehicles/{id}

Example response:
```
{
  "success": true,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "vehicleNumber": "FL-001",
    "driverName": "John Smith",
    "driverPhone": "+1234567890",
    "status": "en_route",
    "destination": "Downtown Office Building",
    "currentLocation": {
      "lat": 37.7749,
      "lng": -122.4194
    },
    "speed": 45,
    "lastUpdated": "2025-08-18T10:30:00.000Z",
    "estimatedArrival": "2025-08-18T11:30:00.000Z",
    "batteryLevel": 85,
    "fuelLevel": 75
  },
  "timestamp": "2025-08-18T10:30:00.000Z"
}
```

Same structure for the 400 and 500 error response


### /api/vehicles/status/{status}

```
{
  "success": true,
  "data": [
    {
      "id": "ac269940-93a9-4df2-a90a-c073405b9b38",
      "vehicleNumber": "FL-004",
      "driverName": "Sarah Johnson",
      "driverPhone": "+19758227654",
      "status": "idle",
      "destination": "Manufacturing Plant",
      "currentLocation": {
        "lat": 37.72131742145172,
        "lng": -122.50290452034653
      },
      "speed": 0,
      "lastUpdated": "2026-09-24T09:52:41.517Z",
      "estimatedArrival": null,
      "batteryLevel": 84,
      "fuelLevel": 62
    },
  ],
  "total": 1,
  "status": "idle",
  "timestamp": "2026-09-24T09:54:40.378Z"
}
```


### api/statistics

Response:
```
{
  "success": true,
  "data": {
    "total": 25,
    "idle": 8,
    "en_route": 12,
    "delivered": 5,
    "average_speed": 35.5,
    "timestamp": "2025-08-18T10:30:00.000Z"
  }
}
```
