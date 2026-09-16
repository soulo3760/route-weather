import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');
  const apiKey = process.env.WEATHER_API_KEY;

  if (!q) {
    return NextResponse.json({ error: 'City query is required' }, { status: 400 });
  }

  if (!apiKey || apiKey === 'your_api_key_here') {
    return NextResponse.json(getMockWeatherData(q));
  }

  try {
    // Fetch current weather for the requested city
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${q}&appid=${apiKey}&units=metric`
    );

    if (!response.ok) {
      throw new Error(`City not found or API error: ${response.status}`);
    }

    const data = await response.json();

    // Transform OpenWeatherMap data to match the frontend WeatherData interface
    const transformedData = {
      location: {
        name: data.name,
        region: data.sys.country,
        country: data.sys.country,
      },
      current: {
        temp_c: data.main.temp,
        condition: {
          text: data.weather[0].description,
          icon: data.weather[0].icon,
        },
        wind_kph: data.wind.speed * 3.6, // convert m/s to km/h
        humidity: data.main.humidity,
        uv: 0, // UV requires separate API call in OpenWeatherMap
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
