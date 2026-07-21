import path from "path";

const vitestConfig = {
  test: {
    environment: "node",
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
};

export default vitestConfig;
