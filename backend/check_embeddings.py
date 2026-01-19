import pickle

with open("embeddings.pkl", "rb") as f:
    data = pickle.load(f)

print(type(data))
print(data.keys())
