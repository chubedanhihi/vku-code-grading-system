# Sandbox image cho Judge Engine: chứa trình biên dịch/thông dịch + GNU time để đo CPU time & peak RSS.
# Build: docker build -t vku-sandbox:latest sandbox/
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive \
    LANG=C.UTF-8 \
    PYTHONDONTWRITEBYTECODE=1

RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc g++ libc6-dev python3 time openjdk-17-jdk-headless \
 && rm -rf /var/lib/apt/lists/*

# Code sinh viên không bao giờ chạy bằng root: backend truyền --user <uid>:<gid> khi chạy container.
WORKDIR /work
