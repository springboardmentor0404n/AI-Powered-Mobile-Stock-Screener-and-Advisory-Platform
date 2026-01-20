from typing import List


def chunk_text(
    text: str,
    chunk_size: int = 700,
    overlap: int = 100
) -> List[str]:
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap

    return chunks
