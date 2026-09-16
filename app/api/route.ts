import { NextRequest, NextResponse } from 'next/server';

// Helper function to ensure ALL weather calls use metric units
async function fetchWeatherMetric(query: string | { lat: number; lon: number }, apiKey: string) {
  let url = `https://api.openweathermap.org/data/2.5/weather?appid=${apiKey}&units=metric`;
  
  if (typeof query === 'string') {
    url += `&q=${encodeURIComponent(query)}`;
  } else {
    url += `&lat=${query.lat}&lon=${query.lon}`;
  }

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Weather API error: ${res.status}`);
  return res.json();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startCity = searchParams.get('start');
  const endCity = searchParams.get('end');
  const orsKey = process.env.ORS_API_KEY;
  const weatherKey = process.env.WEATHER_API_KEY;

  if (!startCity || !endCity) {
    return NextResponse.json({ error: 'Both start and end cities are required' }, { status: 400 });
  }

  try {
    // 1. Get Start and End data using the helper (Guarantees Metric)
    const startData = await fetchWeatherMetric(startCity, weatherKey);
    const endData = await fetchWeatherMetric(endCity, weatherKey);

    const startLat = startData.coord.lat;
    const startLon = startData.coord.lon;
    const endLat = endData.coord.lat;
    const endLon = endData.coord.lon;

    let finalRoute = [];

    try {
      // 2. REAL ROAD ROUTE
      const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${startLon},${startLat}&end=${endLon},${endLat}`;
      const routeRes = await fetch(orsUrl);
      
      if (routeRes.ok) {
        const routeData = await routeRes.json();
        const coordinates = routeData.features[0].geometry.coordinates;
        const totalPoints = coordinates.length;

        const samplePoints = [0.2, 0.4, 0.6, 0.8];
        const waypointsData = [];

        for (const ratio of samplePoints) {
          const index = Math.floor(totalPoints * ratio);
          const [lon, lat] = coordinates[index];
          try {
            const wData = await fetchWeatherMetric({ lat, lon }, weatherKey);
            waypointsData.push({
              location: { name: wData.name || 'Waypoint', region: wData.sys?.country || 'Unknown', country: wData.sys?.country || 'Unknown' },
              coord: { lat: wData.coord.lat, lon: wData.coord.lon },
              current: {
                temp_c: wData.main.temp,
                condition: { text: wData.weather[0].description, icon: wData.weather[0].icon },
                wind_kph: wData.wind.speed * 3.6,
                humidity: wData.main.humidity,
                uv: 0,
                feelslike_c: wData.main.feels_like,
              }
            });
          } catch (e) {
            console.error("Waypoint fetch failed");
          }
        }

        finalRoute = [
          {
            location: { name: startData.name, region: startData.sys.country, country: startData.sys.country },
            coord: { lat: startLat, lon: startLon },
            current: {
              temp_c: startData.main.temp,
              condition: { text: startData.weather[0].description, icon: startData.weather[0].icon },
              wind_kph: startData.wind.speed * 3.6,
              humidity: startData.main.humidity,
              uv: 0,
              feelslike_c: startData.main.feels_like,
            }
          },
          ...waypointsData,
          {
            location: { name: endData.name, region: endData.sys.country, country: endData.sys.country },
            coord: { lat: endLat, lon: endLon },
            current: {
              temp_c: endData.main.temp,
              condition: { text: endData.weather[0].description, icon: endData.weather[0].icon },
              wind_kph: endData.wind.speed * 3.6,
              humidity: endData.main.humidity,
              uv: 0,
              feelslike_c: endData.main.feels_like,
            }
          }
        ];
      } else {
        throw new Error("Routing failed");
      }
    } catch (routingError) {
      // Fallback to Smart Approximation
      const waypoints: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const ratio = i / 4;
        const lat = startLat + (endLat - startLat) * ratio;
        const lon = startLon + (endLon - startLon) * ratio;
        try {
          const wData = await fetchWeatherMetric({ lat, lon }, weatherKey);
          waypoints.push({
            location: { name: wData.name || 'Waypoint', region: wData.sys?.country || 'Unknown', country: wData.sys?.country || 'Unknown' },
            coord: { lat: wData.coord.lat, lon: wData.coord.lon },
            current: {
              temp_c: wData.main.temp,
              condition: { text: wData.weather[0].description, icon: wData.//weather[0].icon },
              wind_kph: wData.wind.speed * 3.6,
              humidity: wData.main.humidity,
              uv: 0,
              feelslike_c: wData.main.feels_like,
            }
          });
        } catch (e) {}
      }

      finalRoute = [
        {
          location: { name: startData.name, region: startData.sys.country, country: startData.sys.country },
          coord: { lat: startLat, lon: startLon },
          current: {
            temp_c: startData.main.temp,
            condition: { text: startData.weather[0].description, icon: startData.weather[0].icon },
            wind_kph: startData.wind.speed * 3.6,
            humidity: startData.main.humidity,
            uv: 0,
            feelslike_c: startData.main.feels_like,
          }
        },
        ...waypoints,
        {
          location: { name: endData.name, region: endData.sys.country, country: endData.sys.country },
          coord: { lat: endLat, lon: endLon },
          current: {
            temp_c: endData.main.temp,
            condition: { text: endData.weather[0].description, icon: endData.weather[0].icon },
            wind_kph: endData.wind.speed * 3.6,
            humidity: endData.main.humidity,
            uv: 0,
            feelslike_c: endData.main.feels_like,
          }
        }
      ];
    }

    return NextResponse.json(finalRoute);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
