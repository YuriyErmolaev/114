import uvicorn
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="FastAPI server host")
    parser.add_argument("--port", type=int, default=8000, help="FastAPI server port")
    args = parser.parse_args()
    # run server
    uvicorn.run("app.api:app", host=args.host, port=args.port, reload=True)
