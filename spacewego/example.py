# SPDX-License-Identifier: Proprietary
# SPDX-FileCopyrightText: 2025 Spacewego, LLC
"""Example for generating data used for Threejs animation."""

import numpy as np
from astro.models.common_physical_types import TimeDuration
from astro.models.state import (
    ArgumentOfPeriapsis,
    Eccentricity,
    Inclination,
    KeplerianState,
    RightAscensionAscendingNode,
    SemimajorAxis,
    TrueAnomaly,
)
from astro.propagation.earth_model.earth_model import EGM96
from astro.propagation.interface import PropagationInterface
from astro.transform.elements import coe2rv
from astro.transform.xforms.iau2010_cio_based import debugger
from astro.vecca.cartesian import CartesianState, Frame
from astropy import units
from astropy.time import Time

FPATH = "/app/spacewego-workspace/spacewego/build/output/orbit_data.txt"

epoch = Time("2025-08-01T00:00:00.000Z", scale="utc")

Re = EGM96.radius
altitude = 400  # [km]
ecc = 0.0001
rp = Re.value + altitude
a = rp / (1 - ecc)

num_minutes = 90
prop_period = num_minutes * 60
prop_duration = TimeDuration(value=prop_period, unit=units.s)
prop_interval = TimeDuration(value=60, unit=units.s)


kep_init_state = KeplerianState(
    semimajorAxis=SemimajorAxis(value=a, unit=units.km),
    eccentricity=Eccentricity(value=ecc),
    inclination=Inclination(value=45.0, unit=units.deg),
    rightAscensionAscendingNode=RightAscensionAscendingNode(
        value=0.0001, unit=units.deg
    ),
    argumentOfPeriapsis=ArgumentOfPeriapsis(value=0.001, unit=units.deg),
    trueAnomaly=TrueAnomaly(value=0.001, unit=units.deg),
)

ts_init_state = coe2rv(kepState=kep_init_state, mu=EGM96.mu)
cs_init_state = CartesianState.from_translational_state(
    ts_state=ts_init_state,
    time=epoch,
    frame=Frame.EME2000,
)

ERA_0_rad, _ = debugger(
    timestamp=epoch,
    data_gcrf=np.concatenate(
        [cs_init_state.position.value, cs_init_state.velocity.value]
    ),
)

propagator = PropagationInterface(earth_model="EGM96", gravity="two-body")

prop_states = propagator.propagate(
    initial_state=cs_init_state,
    prop_duration=prop_duration,
    prop_interval=prop_interval,
)


# Format data for output
content = "# Orbital Data\n"
content += f"Earth Radius [km]: {EGM96.radius.value}"
content += f"Initial Earth rotation angle [radians]: {ERA_0_rad}\n"
content += f"Earth rotation angular rate [radians/second]: {EGM96.rot_rate.value}\n"
content += "# Timing and ECI position data follows\n"
content += "# Format: <timestamp-string>,<time-since-epoch-seconds>,<ECI-x-position-"
content += "km>,<ECI-y-position-km>,<ECI-z-position-km>\n"
for ps in prop_states:
    content += f"{ps.time},{(ps.time-epoch).sec},{ps.pos[0].value},{ps.pos[1].value},"
    content += f"{ps.pos[2].value}\n"

with open(FPATH, "w") as f:
    f.write(content)
