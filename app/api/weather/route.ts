import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const apiKey = process.env.WEATHER_API_KEY;

  if (!q && !lat) {
    return NextResponse.json({ error: 'City or coordinates are required' }, { status: 400 });
  }

  if (!apiKey || apiKey === 'your_api_key_here') {
    return NextResponse.json(getMockWeatherData(q || 'Unknown'));
  }

  try {
    let url = `https://api.openweathermap.org/data/2.5/weather?appid=${apiKey}&units=metric`;
    
    if (lat && lon) {
      url += `&lat=${lat}&lon=${lon}`;
    } else if (q) {
      url += `&q=${q}`;
    }

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Weather API responded with ${response.status}`);
    }

    const data = await response.json();

    const transformedData = {
      location: {
        name: data.name || 'Waypoint',
        region: data.sys?.country || 'Unknown',
        country: data.sys?.country || 'Unknown',
      },
      coord: {
        lat: data.coord.lat,
        lon: data.coord.lon,
      },
      current: {
        temp_c: data.main.temp,
        condition: {
          text: data.weather[0].description,
          icon: data.weather[0].icon,
        },
        wind_kph: data.wind.speed * 3.6,
        humidity: data.main.humidity,
        uv: 0,
        feelslike_c: data.main.feels_like,
      },
    };

    return NextResponse.json(transformedData);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function getMockWeatherData(city: string) {
  return {
    location: { name: city, region: 'Mock Region', country: 'Mock Country' },
    coord: { lat: 0, lon: 0 },
    current: { 
      temp_c: 25, 
      condition: { text: 'Partly Cloudy', icon: '02d' }, 
      wind_kph: 10, 
      humidity: 50, 
      uv: 5, 
      feelslike_c: 26 
    },
  };
}
