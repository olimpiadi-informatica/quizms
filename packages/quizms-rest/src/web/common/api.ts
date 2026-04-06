import ky from "ky";

const api = ky.create({
  prefixUrl: `${process.env.BASE_PATH}api`,
});

export default api;
