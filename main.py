from fastapi import FastAPI, status, Depends, HTTPException


app = FastAPI()



@app.get("/")
def read_root():
    return {"message": "Hello World"}