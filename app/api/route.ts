import { NextRequest, NextResponse } from 'next/server';

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
    // 1. Get Coordinates for Start and End via OpenWeatherMap
    const startRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${startCity}&appid=${weatherKey}`);
    if (!startRes.ok) throw new Error(`Could not find start city: ${startCity}`);
    const startData = await startRes.json();

    const endRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${endCity}&appid=${weatherKey}`);
    if (!endRes.ok) throw new Error(`Could not find destination city: ${endCity}`);
    const endData = await endRes.json();

    // 2. Request REAL ROAD ROUTE from OpenRouteService
    const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${startData.coord.lon},${startData.coord.lat}&end=${endData.coord.lon},${endData.coord.lat}`;
    const routeRes = await fetch(orsUrl);
    
    if (!routeRes.ok) {
      throw new Error(`Routing error: ${routeRes.status}`);
    }
    const routeData = await routeRes.json();
    
    // The geometry is a line string of coordinates
    const coordinates = routeData.features[0].geometry.coordinates;
    const totalPoints = coordinates.length;

    // 3. Sample 3 waypoints along the ACTUAL road path (25%, 50%, 75%)
    const samples = [0.25, 0.5, 0.75].map(ratio => {
      const index = Math.floor(totalPoints * ratio);
      const [lon, lat] = coordinates[index];
      return { lat, lon };
    });

    // 4. Fetch weather for these specific road points
    const waypointWeather = await Promise.all(
      samples.map(async (pt) => {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${pt.lat}&lon=${pt.lon}&appid=${weatherKey}&units=metric`);
        const data = await res.json();
        return {
          location: { name: data.name || 'Waypoint', region: data.sys?.country || 'Unknown', country: data.sys?.country || 'Unknown' },
          coord: { lat: pt.lat, lon: pt.lon },
          current: {
            temp_c: data.main.temp,
            condition: { text: data.weather[0].description, icon: data.weather[0].icon },
            wind_kph: data.wind.speed * 3.6,
            humidity: data.main.humidity,
            uv: 0,
            feelslike_c: data.main.feels_like,
          }
        };
      })
    );

    // Construct final result: [Start, Waypoint1, Waypoint2, Waypoint3, End]
    const finalRoute = [
      {
        location: { name: startData.name, region: startData.sys.country, country: startData.sys.country },
        coord: { lat: startData.coord.lat, lon: startData.coord.lon },
        current: {
          temp_c: startData.main.temp,
          condition: { text: startData.weather[0].description, icon: startData.weather[0].icon },
          wind_kph: startData.wind.speed * 3.6,
          humidity: startData.main.humidity,
          uv: 0,
          feelslike_c: startData.main.feels_like,
        }
      },
      ...waypointWeather,
      {
        location: { name: endData.name, region: endData.sys.country, country: endData.sys.country },
        coord: { lat: endData.coord.lat, lon: endData.coord.lon },
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

    return NextResponse.json(finalRoute);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
