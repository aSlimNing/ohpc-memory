from flask import Flask, jsonify
app = Flask(__name__)
@app.route("/api/ping")
def ping(): return jsonify(ok=True, msg="py ok")
app.run(port=8934)
