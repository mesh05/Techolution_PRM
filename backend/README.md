# Techo Project Setup Guide

Follow these steps to set up and run the project locally:

1. **Create a virtual environment:**

   ```bash
   python -m venv .venv
   ```

2. **Activate the virtual environment:**

   ```bash
   .venv\Scripts\activate
   ```

3. **Install the required packages:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```
