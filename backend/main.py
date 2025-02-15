from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import subprocess
import os
import tempfile
import base64
from sse_starlette.sse import EventSourceResponse
import asyncio
from typing import List

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CircuitCode(BaseModel):
    code: str

# Store connected clients
clients: List[asyncio.Queue] = []

@app.post("/api/compile")
async def compile_circuit(circuit: CircuitCode):
    # LaTeX template for CircuiTikZ
    latex_template = r"""
\documentclass[border=3mm]{standalone}
\usepackage{circuitikz}
\begin{document}
\begin{circuitikz}
%s
\end{circuitikz}
\end{document}
"""
    
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create and write LaTeX file
            tex_path = os.path.join(tmpdir, "circuit.tex")
            with open(tex_path, "w") as f:
                f.write(latex_template % circuit.code)
            
            # Compile LaTeX to PDF
            subprocess.run(["pdflatex", "-output-directory", tmpdir, tex_path], 
                         check=True, capture_output=True)
            
            # Convert PDF to PNG
            pdf_path = os.path.join(tmpdir, "circuit.pdf")
            png_path = os.path.join(tmpdir, "circuit.png")
            subprocess.run(["convert", "-density", "300", pdf_path, png_path],
                         check=True, capture_output=True)
            
            # Read PNG and convert to base64
            with open(png_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode()
            
            # Notify all connected clients
            for client in clients:
                await client.put({"code": circuit.code})
            
            return {"image": image_data}
            
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=400, detail="Compilation failed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/updates")
async def get_updates():
    queue = asyncio.Queue()
    clients.append(queue)
    
    async def event_generator():
        try:
            while True:
                data = await queue.get()
                yield {"data": JSONResponse(content=data).body.decode()}
        finally:
            clients.remove(queue)
    
    return EventSourceResponse(event_generator())

@app.get("/health")
async def health_check():
    return {"status": "healthy"}