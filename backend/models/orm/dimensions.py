"""ORM Dimension table models — star schema."""
from sqlalchemy import Column, Integer, String, Float, Date, Text, Boolean
from sqlalchemy.orm import relationship
from backend.core.database import Base


class DimCircuit(Base):
    __tablename__ = "dim_circuits"

    circuit_id = Column(Integer, primary_key=True)
    circuit_ref = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    location = Column(String(100))
    country = Column(String(100))
    lat = Column(Float)
    lng = Column(Float)
    alt = Column(Float)
    url = Column(Text)

    races = relationship("DimRace", back_populates="circuit")


class DimConstructor(Base):
    __tablename__ = "dim_constructors"

    constructor_id = Column(Integer, primary_key=True)
    constructor_ref = Column(String(100), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    nationality = Column(String(100))
    url = Column(Text)

    results = relationship("FactRaceResult", back_populates="constructor")
    standings = relationship("FactConstructorStanding", back_populates="constructor")


class DimDriver(Base):
    __tablename__ = "dim_drivers"

    driver_id = Column(Integer, primary_key=True)
    driver_ref = Column(String(100), unique=True, nullable=False)
    number = Column(Integer, nullable=True)
    code = Column(String(10), nullable=True)
    forename = Column(String(100), nullable=False)
    surname = Column(String(100), nullable=False)
    full_name = Column(String(200))
    dob = Column(Date, nullable=True)
    nationality = Column(String(100))
    url = Column(Text)

    results = relationship("FactRaceResult", back_populates="driver")
    standings = relationship("FactDriverStanding", back_populates="driver")


class DimSeason(Base):
    __tablename__ = "dim_seasons"

    year = Column(Integer, primary_key=True)
    url = Column(Text)

    races = relationship("DimRace", back_populates="season")


class DimStatus(Base):
    __tablename__ = "dim_status"

    status_id = Column(Integer, primary_key=True)
    status = Column(String(100), nullable=False)

    results = relationship("FactRaceResult", back_populates="status")


class DimRace(Base):
    __tablename__ = "dim_races"

    race_id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False)
    round = Column(Integer, nullable=False)
    circuit_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    date = Column(Date, nullable=True)
    time = Column(String(20), nullable=True)
    url = Column(Text)

    # Session dates
    fp1_date = Column(Date, nullable=True)
    fp2_date = Column(Date, nullable=True)
    fp3_date = Column(Date, nullable=True)
    quali_date = Column(Date, nullable=True)
    sprint_date = Column(Date, nullable=True)

    season = relationship("DimSeason", back_populates="races")
    circuit = relationship("DimCircuit", back_populates="races")
    results = relationship("FactRaceResult", back_populates="race")
    lap_times = relationship("FactLapTime", back_populates="race")
    pit_stops = relationship("FactPitStop", back_populates="race")
    qualifying = relationship("FactQualifying", back_populates="race")
    driver_standings = relationship("FactDriverStanding", back_populates="race")
    constructor_standings = relationship("FactConstructorStanding", back_populates="race")
