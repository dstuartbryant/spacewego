from astro_utils import (
    get_earth_rotation_angle_degrees,
    get_position_ECEF,
    get_sun_position_vector_ECI,
)
from astropy.time import Time
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.route("/api/get_ecef_position", methods=["GET"])
def get_ecef_position():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)

    if lat is None or lon is None:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    position = get_position_ECEF(lat, lon)
    return jsonify(position)


@app.route("/api/get_earth_rotation_angle", methods=["GET"])
def get_earth_rotation_angle():
    timestamp_str = request.args.get("timestamp")

    if not timestamp_str:
        return jsonify({"error": "Timestamp is required"}), 400

    try:
        timestamp = Time(timestamp_str, format="isot", scale="utc")
        angle = get_earth_rotation_angle_degrees(timestamp)
        return jsonify({"angle": angle})
    except ValueError as e:
        return jsonify({"error": f"Invalid timestamp format: {e}"}), 400


@app.route("/api/get_sun_position", methods=["GET"])
def get_sun_position():
    timestamp_str = request.args.get("timestamp")

    if not timestamp_str:
        return jsonify({"error": "Timestamp is required"}), 400

    try:
        timestamp = Time(timestamp_str, format="isot", scale="utc")
        position = get_sun_position_vector_ECI(timestamp)
        return jsonify(position)
    except ValueError as e:
        return jsonify({"error": f"Invalid timestamp format: {e}"}), 400


if __name__ == "__main__":
    app.run(debug=True, port=5001)
