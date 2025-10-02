//TODO: разобраться с kc, clientID должен быть параметр конкретного экземпляра web-приложения
// export const environment = {
//   apiUrl: '/api/v1',
//   wsUrl: '/ws',
//   docsUrl: '/docs',
//   kcUrl: 'https://platform.ai-center.online/realms',
//   kcClientId: 'fastapi-client',
//   kcUsername: 'demo',
//   kcPassword: 'demo123',
//   mediapipeVisionBaseUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3',
//   faceLandmarkerModelUrl: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
//   handsLandmarkerModelUrl: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
//   poseLandmarkerModelUrl: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
// };



export const environment = {
  apiUrl: 'http://localhost:18080',
  wsUrl: '/ws',
  docsUrl: '/docs',
  kcUrl: 'https://platform.ai-center.online/realms',
  kcClientId: 'fastapi-client',
  kcUsername: 'demo',
  kcPassword: 'demo123',
  mediapipeVisionBaseUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3',
  faceLandmarkerModelUrl: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
  handsLandmarkerModelUrl: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  poseLandmarkerModelUrl: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task'
};
