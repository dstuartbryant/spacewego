from astro.celestial_phenom import sun_position_vector
from astro.transform.xforms.ecef2topocentric import (
    Altitude,
    Latitude,
    Longitude,
    lla_geodetic_to_itrf_pos,
)
from astro.transform.xforms.iau2010_cio_based import supporting_elements
from astropy import units
from astropy.time import Time


def get_position_ECEF(lat: float, lon: float) -> list:
    pv = lla_geodetic_to_itrf_pos(
        lat=Latitude(value=lat, unit=units.deg),
        lon=Longitude(value=lon, unit=units.deg),
        alt=Altitude(value=(0.0), unit=units.km),
    )
    return [float(x) for x in pv.value]


def get_sun_position_vector_ECI(timestamp: Time) -> list:
    spv = sun_position_vector(timestamp=timestamp)

    return [float(x) for x in spv.value]


def get_earth_rotation_angle_degrees(timestamp: Time) -> float:
    era, _, _, _ = supporting_elements(timestamp=timestamp)
    return era.value
