const API_URL = process.env.LARAVEL_API_URL || 'http://127.0.0.1:8000/api';

exports.handler = async (event) => {
  const path = event.path.replace('/.netlify/functions/api-proxy', '');
  const targetUrl = `${API_URL}${path}`;

  const headers = {};
  if (event.headers['content-type']) {
    headers['Content-Type'] = event.headers['content-type'];
  }
  if (event.headers['authorization']) {
    headers['Authorization'] = event.headers['authorization'];
  }
  if (event.headers['accept']) {
    headers['Accept'] = event.headers['accept'];
  }

  const fetchOptions = {
    method: event.httpMethod,
    headers,
  };

  if (event.body && event.httpMethod !== 'GET' && event.httpMethod !== 'HEAD') {
    const isFormData = event.headers['content-type']?.includes('multipart/form-data');
    if (isFormData && event.isBase64Encoded) {
      const buf = Buffer.from(event.body, 'base64');
      fetchOptions.body = buf;
      fetchOptions.duplex = 'half';
    } else if (!isFormData) {
      fetchOptions.body = event.body;
    }
  }

  try {
    const response = await fetch(targetUrl, fetchOptions);
    let data;

    const ct = response.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      statusCode: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Content-Type': ct,
      },
      body: typeof data === 'string' ? data : JSON.stringify(data),
    };
  } catch (error) {
    return {
      statusCode: 502,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        success: false,
        message: 'Gagal terhubung ke server backend.',
        error: error.message,
      }),
    };
  }
};
