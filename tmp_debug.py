from backend.app.llm.groq_provider import GroqProvider
s = "{'error': {'message': 'Please try again in 1.0s'}}"
print('Direct value:', GroqProvider._extract_retry_after_seconds(s))

import asyncio, httpx

async def run():
    class FakeResponse:
        def __init__(self, status_code, payload):
            self.status_code = status_code
            self._payload = payload
            self.text = str(payload)
            self.request = httpx.Request('POST', 'https://example.test')
        def raise_for_status(self):
            if self.status_code >= 400:
                raise httpx.HTTPStatusError(f'HTTP {self.status_code}', request=self.request, response=self)
        def json(self):
            return self._payload

    class FakeClient:
        def __init__(self, *args, **kwargs):
            self.calls = 0
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc, tb):
            return None
        async def post(self, url, headers, json):
            self.calls += 1
            if self.calls == 1:
                return FakeResponse(429, {'error': {'message': 'Please try again in 1.0s'}})
            return FakeResponse(200, {'choices': [{'message': {'content': '{"ok": true}'}}]})

    original = httpx.AsyncClient
    httpx.AsyncClient = FakeClient
    try:
        provider = GroqProvider(api_key='test-key', model='test-model', base_url='https://example.test')
        result = await provider._request({'model': 'test-model', 'messages': []})
        print('RESULT:', result)
    finally:
        httpx.AsyncClient = original

asyncio.run(run())
