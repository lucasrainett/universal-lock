import { Configuration } from "webpack";

export default {
	mode: "production",
	devtool: "cheap-source-map",
	target: ["es5", "web"],
	entry: "./src/index.ts",
	resolve: {
		extensions: [".ts"],
	},
	optimization: {
		minimize: false,
	},
	output: {
		libraryTarget: "umd2",
		library: "UniversalLock",
		globalObject: "this",
		filename: "index.umd.js",
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: "ts-loader",
			},
		],
	},
} satisfies Configuration;
