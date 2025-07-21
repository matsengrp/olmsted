#!/usr/bin/env python

"""
Setup script for olmsted-cli package.
"""

from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setup(
    name="olmsted-cli",
    version="0.1.0",
    author="Matsen Group",
    author_email="",
    description="Command-line tools for processing immunological sequence data for Olmsted visualization",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/matsengrp/olmsted",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Science/Research",
        "Topic :: Scientific/Engineering :: Bio-Informatics",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.7",
    install_requires=[
        "ete3>=3.1.3",
        "jsonschema>=4.17.3",
        "lxml>=4.9.2",
        "numpy>=1.24.3",
        "pyyaml>=6.0",
        "scipy>=1.10.1",
        "boto3>=1.26.137",
        "botocore>=1.29.137",
        "ntpl>=0.0.4",
    ],
    entry_points={
        "console_scripts": [
            "olmsted-process=bin.olmsted_process:main",
        ],
    },
    scripts=[
        "bin/olmsted-process",
        "bin/process_data.py",
        "bin/process_pcp_data.py",
    ],
    include_package_data=True,
    zip_safe=False,
)