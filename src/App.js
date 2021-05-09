import { useEffect, useState, useRef } from "react";
import "./styles.css";
import Camera from "./components/camera";
import { NVISION_API_KEY } from "./configs.json";

import { getImageSize } from "./utils/image";
import { toBase64, getByteBase64 } from "./utils/base64";

const nvision = require("@nipacloud/nvision");

const objectDetectionService = nvision.objectDetection({
  apiKey: NVISION_API_KEY
});

const colorScheme = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "cyan",
  "purple"
];

export default function App() {
  const [isUseCamera, setUseCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [result, setResult] = useState(null);
  const refPhoto = useRef(null);
  const refCanvas = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 300, height: 100 });
  const [imageSize, setImageSize] = useState({ width: 300, height: 100 });

  useEffect(() => {
    if (photo) {
      objectDetectionService
        .predict({
          rawData: getByteBase64(photo)
        })
        .then((result) => {
          setResult(result);
        })
        .catch((err) => {
          console.log(err.message);
        });
    }
  }, [photo]);

  useEffect(() => {
    if (refPhoto?.current) {
      const { offsetWidth, offsetHeight } = refPhoto.current;
      setCanvasSize({ width: offsetWidth, height: offsetHeight });
    }
  }, [photo]);

  const drawBox = ({ ctx, x, y, width, height, color }) => {
    ctx.beginPath();
    ctx.lineWidth = "2";
    ctx.rect(x, y, width, height);
    ctx.strokeStyle = color;
    ctx.stroke();
  };

  useEffect(() => {
    if (result) {
      const canvas = refCanvas.current;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      const { detected_objects } = result;
      const resolutionMultiply = canvasSize.width / imageSize.width;
      detected_objects.forEach((object, i) => {
        const { bottom, left, right, top } = object.bounding_box;
        const x = left * resolutionMultiply;
        const y = top * resolutionMultiply;
        const width = (right - left) * resolutionMultiply;
        const height = (bottom - top) * resolutionMultiply;
        drawBox({ ctx, x, y, width, height, color: colorScheme[i] });
      });
    }
  }, [result, canvasSize, imageSize]);

  const handleTakePhoto = async (dataUri) => {
    if (dataUri) {
      setPhoto(dataUri);
      const imageSize = await getImageSize(dataUri);
      setImageSize(imageSize);
      setUseCamera(false);
    }
  };

  const handleUploadPhoto = async (e) => {
    const input = e.target;
    const _photo = await toBase64(input.files[0]);
    setPhoto(_photo);
    const imageSize = await getImageSize(_photo);
    setImageSize(imageSize);
  };

  const handleResetPhoto = () => {
    setPhoto(false);
    setResult(null);
    const canvas = refCanvas.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 300, 100);
  };

  return (
    <div className="App p-4">
      <div className="flex justify-center items-center w-full p-4 min-h-72 border-2 rounded mb-2">
        {/* CANVAS */}
        <div className={`relative ${!photo && "hidden"}`}>
          <img ref={refPhoto} src={photo} width="300" />
          <canvas
            ref={refCanvas}
            width="300"
            className="absolute z-10 top-0 left-0"
          />
        </div>

        {!photo &&
          (isUseCamera ? (
            <Camera onTakePhoto={handleTakePhoto} />
          ) : (
            <div className="flex flex-col">
              <input type="file" onChange={handleUploadPhoto} />
              or
              <button
                className="bg-gray-200 p-2"
                onClick={() => setUseCamera(true)}
              >
                Click to use Camera
              </button>
            </div>
          ))}
      </div>

      {result && (
        <table className="border-collapse border text-left">
          <tbody>
            {result.detected_objects.map((object, i) => (
              <tr>
                <td className="border p-2" style={{ color: colorScheme[i] }}>
                  ●
                </td>
                <td className="border p-2">{object.parent}</td>
                <td className="border p-2">{object.name}</td>
                <td className="border p-2">
                  {Math.floor(object.confidence * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <br />

      {photo && (
        <button className="bg-gray-200 p-2" onClick={handleResetPhoto}>
          Change Photo
        </button>
      )}
      {isUseCamera && (
        <button className="bg-gray-200 p-2" onClick={() => setUseCamera(false)}>
          Cancel camera
        </button>
      )}
    </div>
  );
}
