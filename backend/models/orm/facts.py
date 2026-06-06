"""ORM Fact table models — star schema."""
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from backend.core.database import Base


class FactRaceResult(Base):
    __tablename__ = "fact_race_results"

    result_id = Column(Integer, primary_key=True)
    race_id = Column(Integer, ForeignKey("dim_races.race_id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("dim_drivers.driver_id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("dim_constructors.constructor_id"), nullable=False)
    status_id = Column(Integer, ForeignKey("dim_status.status_id"), nullable=True)

    number = Column(Integer, nullable=True)
    grid = Column(Integer, nullable=True)
    position = Column(Integer, nullable=True)
    position_text = Column(String(10))
    position_order = Column(Integer)
    points = Column(Float, default=0)
    laps = Column(Integer, nullable=True)
    time_text = Column(String(50), nullable=True)
    milliseconds = Column(Integer, nullable=True)
    fastest_lap = Column(Integer, nullable=True)
    rank = Column(Integer, nullable=True)
    fastest_lap_time = Column(String(20), nullable=True)
    fastest_lap_speed = Column(Float, nullable=True)

    # Derived
    finished = Column(Boolean, default=True)
    positions_gained = Column(Integer, nullable=True)

    race = relationship("DimRace", back_populates="results")
    driver = relationship("DimDriver", back_populates="results")
    constructor = relationship("DimConstructor", back_populates="results")
    status = relationship("DimStatus", back_populates="results")


class FactLapTime(Base):
    __tablename__ = "fact_lap_times"

    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("dim_races.race_id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("dim_drivers.driver_id"), nullable=False)

    lap = Column(Integer, nullable=False)
    position = Column(Integer)
    time_text = Column(String(20))
    milliseconds = Column(Integer)

    race = relationship("DimRace", back_populates="lap_times")
    driver = relationship("DimDriver")


class FactPitStop(Base):
    __tablename__ = "fact_pit_stops"

    id = Column(Integer, primary_key=True, autoincrement=True)
    race_id = Column(Integer, ForeignKey("dim_races.race_id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("dim_drivers.driver_id"), nullable=False)

    stop = Column(Integer)
    lap = Column(Integer)
    time_text = Column(String(20))
    duration_text = Column(String(20))
    duration_ms = Column(Integer)

    race = relationship("DimRace", back_populates="pit_stops")
    driver = relationship("DimDriver")


class FactQualifying(Base):
    __tablename__ = "fact_qualifying"

    qualify_id = Column(Integer, primary_key=True)
    race_id = Column(Integer, ForeignKey("dim_races.race_id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("dim_drivers.driver_id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("dim_constructors.constructor_id"), nullable=False)

    number = Column(Integer)
    position = Column(Integer)
    q1 = Column(String(20))
    q2 = Column(String(20))
    q3 = Column(String(20))
    q1_ms = Column(Integer, nullable=True)
    q2_ms = Column(Integer, nullable=True)
    q3_ms = Column(Integer, nullable=True)
    best_quali_ms = Column(Integer, nullable=True)

    race = relationship("DimRace", back_populates="qualifying")
    driver = relationship("DimDriver")
    constructor = relationship("DimConstructor")


class FactDriverStanding(Base):
    __tablename__ = "fact_driver_standings"

    standing_id = Column(Integer, primary_key=True)
    race_id = Column(Integer, ForeignKey("dim_races.race_id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("dim_drivers.driver_id"), nullable=False)

    points = Column(Float)
    position = Column(Integer)
    position_text = Column(String(10))
    wins = Column(Integer)

    race = relationship("DimRace", back_populates="driver_standings")
    driver = relationship("DimDriver", back_populates="standings")


class FactConstructorStanding(Base):
    __tablename__ = "fact_constructor_standings"

    standing_id = Column(Integer, primary_key=True)
    race_id = Column(Integer, ForeignKey("dim_races.race_id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("dim_constructors.constructor_id"), nullable=False)

    points = Column(Float)
    position = Column(Integer)
    position_text = Column(String(10))
    wins = Column(Integer)

    race = relationship("DimRace", back_populates="constructor_standings")
    constructor = relationship("DimConstructor", back_populates="standings")


class FactSprintResult(Base):
    __tablename__ = "fact_sprint_results"

    result_id = Column(Integer, primary_key=True)
    race_id = Column(Integer, ForeignKey("dim_races.race_id"), nullable=False)
    driver_id = Column(Integer, ForeignKey("dim_drivers.driver_id"), nullable=False)
    constructor_id = Column(Integer, ForeignKey("dim_constructors.constructor_id"), nullable=False)

    number = Column(Integer, nullable=True)
    grid = Column(Integer, nullable=True)
    position = Column(Integer, nullable=True)
    position_text = Column(String(10))
    position_order = Column(Integer)
    points = Column(Float, default=0)
    laps = Column(Integer, nullable=True)
    time_text = Column(String(50), nullable=True)
    milliseconds = Column(Integer, nullable=True)
    fastest_lap = Column(Integer, nullable=True)
    fastest_lap_time = Column(String(20), nullable=True)
    status_id = Column(Integer, nullable=True)
