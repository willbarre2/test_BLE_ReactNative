To resolve imports (see in options.def) issues:
.proto files downloaded at: https://github.com/protocolbuffers/protobuf/tree/main/src/google/protobuf
and convert with ts-proto: `protoc --plugin=protoc-gen-ts_proto=".\\node_modules\\.bin\\protoc-gen-ts_proto.cmd" --ts_proto_out=. ./protos/google/<import>.proto`