# HTML FPS - Stage 1

## 포함 기능
- WASD 이동
- 마우스 시점
- Pointer Lock
- Space 점프
- 중력
- 평평한 바닥 충돌
- 벽/박스 충돌
- FPS 표시
- 간단한 3D 테스트 맵

## 실행 방법

ES Module을 사용하므로 `index.html`을 파일로 더블클릭하는 것보다
간단한 로컬 서버로 실행하는 것을 권장합니다.

### 방법 1: VS Code
Live Server 확장을 설치한 뒤 `index.html`에서 `Open with Live Server`.

### 방법 2: Python
이 폴더에서 터미널을 열고:

python -m http.server 8000

그 다음 브라우저에서:

http://localhost:8000

## 조작
- WASD: 이동
- Mouse: 시점
- Space: 점프
- ESC: Pointer Lock 해제

## 다음 단계
Stage 2에서 리볼버, 6발 탄창, 발사, 재장전, Raycast 명중 판정을 추가하면 됩니다.
