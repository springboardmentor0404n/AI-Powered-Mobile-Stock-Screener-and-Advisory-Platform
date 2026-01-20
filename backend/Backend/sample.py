import ollama

llm = ollama.Completion(model="llama2:latest")
resp = llm("Hello, how are you?")
print(resp)
