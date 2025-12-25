import requests
from flask import request, Response

def forward(service_url, path):
    url = f"{service_url}/{path}"

    # Correct header forwarding
    headers = {
        key: value
        for key, value in request.headers.items()
        if key.lower() != 'host'
    }

    resp = requests.request(
        method=request.method,
        url=url,
        headers=headers,
        params=request.args,
        data=request.get_data()
    )

    return Response(resp.content, resp.status_code, resp.headers.items())