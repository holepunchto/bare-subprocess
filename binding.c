#include <assert.h>
#include <bare.h>
#include <js.h>
#include <stdlib.h>
#include <utf.h>
#include <uv.h>

typedef struct {
  uv_process_t process;

  js_env_t *env;
  js_ref_t *ctx;
  js_ref_t *on_exit;
} bare_subprocess_t;

typedef utf8_t bare_subprocess_path_t[4096 + 1 /* NULL */];

static void
on_exit (uv_process_t *uv_handle, int64_t exit_status, int term_signal) {
  int err;

  bare_subprocess_t *handle = (bare_subprocess_t *) uv_handle;

  js_env_t *env = handle->env;

  js_handle_scope_t *scope;
  err = js_open_handle_scope(env, &scope);
  assert(err == 0);

  js_value_t *ctx;
  err = js_get_reference_value(env, handle->ctx, &ctx);
  assert(err == 0);

  js_value_t *on_exit;
  err = js_get_reference_value(env, handle->on_exit, &on_exit);
  assert(err == 0);

  js_value_t *argv[2];

  err = js_create_int64(env, exit_status, &argv[0]);
  assert(err == 0);

  err = js_create_int32(env, term_signal, &argv[1]);
  assert(err == 0);

  js_call_function(env, ctx, on_exit, 2, argv, NULL);

  err = js_close_handle_scope(env, scope);
  assert(err == 0);

  err = js_delete_reference(env, handle->on_exit);
  assert(err == 0);

  err = js_delete_reference(env, handle->ctx);
  assert(err == 0);
}

static js_value_t *
bare_subprocess_init (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 2;
  js_value_t *argv[2];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 2);

  js_value_t *arraybuffer;

  bare_subprocess_t *handle;
  err = js_create_arraybuffer(env, sizeof(bare_subprocess_t), (void **) &handle, &arraybuffer);
  assert(err == 0);

  handle->env = env;

  err = js_create_reference(env, argv[0], 1, &handle->ctx);
  assert(err == 0);

  err = js_create_reference(env, argv[1], 1, &handle->on_exit);
  assert(err == 0);

  return arraybuffer;
}

static js_value_t *
bare_subprocess_spawn (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 9;
  js_value_t *argv[9];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 9);

  bare_subprocess_t *handle;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &handle, NULL);
  assert(err == 0);

  bare_subprocess_path_t file;
  err = js_get_value_string_utf8(env, argv[1], file, sizeof(bare_subprocess_path_t), NULL);
  assert(err == 0);

  uint32_t args_len;
  err = js_get_array_length(env, argv[2], &args_len);
  assert(err == 0);

  utf8_t **args = calloc(1 /* file */ + args_len + 1 /* NULL */, sizeof(utf8_t *));

  args[0] = file;

  for (uint32_t i = 0; i < args_len; i++) {
    js_value_t *value;
    err = js_get_element(env, argv[2], i, &value);
    assert(err == 0);

    size_t arg_len;
    err = js_get_value_string_utf8(env, value, NULL, 0, &arg_len);
    assert(err == 0);

    arg_len += 1 /* NULL */;

    utf8_t *arg = malloc(arg_len);
    err = js_get_value_string_utf8(env, value, arg, arg_len, NULL);
    assert(err == 0);

    args[i + 1] = arg;
  }

  bare_subprocess_path_t cwd;
  err = js_get_value_string_utf8(env, argv[3], cwd, sizeof(bare_subprocess_path_t), NULL);
  assert(err == 0);

  uint32_t pairs_len;
  err = js_get_array_length(env, argv[4], &pairs_len);
  assert(err == 0);

  utf8_t **pairs = calloc(pairs_len + 1 /* NULL */, sizeof(utf8_t *));

  for (uint32_t i = 0; i < pairs_len; i++) {
    js_value_t *value;
    err = js_get_element(env, argv[4], i, &value);
    assert(err == 0);

    size_t pair_len;
    err = js_get_value_string_utf8(env, value, NULL, 0, &pair_len);
    assert(err == 0);

    pair_len += 1 /* NULL */;

    utf8_t *pair = malloc(pair_len);
    err = js_get_value_string_utf8(env, value, pair, pair_len, NULL);
    assert(err == 0);

    pairs[i] = pair;
  }

  uint32_t stdio_len;
  err = js_get_array_length(env, argv[5], &stdio_len);
  assert(err == 0);

  uv_stdio_container_t *stdio = malloc(stdio_len * sizeof(uv_stdio_container_t));

  for (uint32_t i = 0; i < stdio_len; i++) {
    js_value_t *value;
    err = js_get_element(env, argv[5], i, &value);
    assert(err == 0);

    js_value_t *property;

    err = js_get_named_property(env, value, "flags", &property);
    assert(err == 0);

    uint32_t flags;
    err = js_get_value_uint32(env, property, &flags);
    assert(err == 0);

    stdio[i] = (uv_stdio_container_t){
      .flags = flags,
    };

    if (flags & UV_INHERIT_FD) {
      err = js_get_named_property(env, value, "fd", &property);
      assert(err == 0);

      uint32_t fd;
      err = js_get_value_uint32(env, property, &fd);
      assert(err == 0);

      stdio[i].data.fd = fd;
    }

    if (flags & UV_CREATE_PIPE) {
      err = js_get_named_property(env, value, "pipe", &property);
      assert(err == 0);

      uv_stream_t *pipe;
      err = js_get_typedarray_info(env, property, NULL, (void **) &pipe, NULL, NULL, NULL);
      assert(err == 0);

      stdio[i].data.stream = pipe;
    }
  }

  bool detached;
  err = js_get_value_bool(env, argv[6], &detached);
  assert(err == 0);

  uint32_t uid;
  err = js_get_value_uint32(env, argv[7], &uid);
  assert(err == 0);

  uint32_t gid;
  err = js_get_value_uint32(env, argv[8], &gid);
  assert(err == 0);

  int flags = 0;

  if (detached) flags |= UV_PROCESS_DETACHED;
  if (uid != (uint32_t) -1) flags |= UV_PROCESS_SETUID;
  if (gid != (uint32_t) -1) flags |= UV_PROCESS_SETGID;

  uv_loop_t *loop;
  js_get_env_loop(env, &loop);

  uv_process_options_t opts = {
    .exit_cb = on_exit,
    .file = (char *) file,
    .args = (char **) args,
    .env = (char **) pairs,
    .cwd = (char *) cwd,
    .flags = flags,
    .stdio_count = stdio_len,
    .stdio = stdio,
    .uid = uid,
    .gid = gid,
  };

  err = uv_spawn(loop, (uv_process_t *) handle, &opts);

  for (uint32_t i = 0; i < args_len; i++) {
    free(args[i + 1]);
  }

  for (uint32_t i = 0; i < pairs_len; i++) {
    free(pairs[i]);
  }

  free(args);
  free(pairs);
  free(stdio);

  js_value_t *pid = NULL;

  if (err < 0) {
    js_throw_error(env, uv_err_name(err), uv_strerror(err));
  } else {
    err = js_create_uint32(env, handle->process.pid, &pid);
    assert(err == 0);
  }

  return pid;
}

static js_value_t *
bare_subprocess_spawn_sync (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 9;
  js_value_t *argv[9];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 9);

  bare_subprocess_t *handle;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &handle, NULL);
  assert(err == 0);

  bare_subprocess_path_t file;
  err = js_get_value_string_utf8(env, argv[1], file, sizeof(bare_subprocess_path_t), NULL);
  assert(err == 0);

  uint32_t args_len;
  err = js_get_array_length(env, argv[2], &args_len);
  assert(err == 0);

  utf8_t **args = calloc(1 /* file */ + args_len + 1 /* NULL */, sizeof(utf8_t *));

  args[0] = file;

  for (uint32_t i = 0; i < args_len; i++) {
    js_value_t *value;
    err = js_get_element(env, argv[2], i, &value);
    assert(err == 0);

    size_t arg_len;
    err = js_get_value_string_utf8(env, value, NULL, 0, &arg_len);
    assert(err == 0);

    arg_len += 1 /* NULL */;

    utf8_t *arg = malloc(arg_len);
    err = js_get_value_string_utf8(env, value, arg, arg_len, NULL);
    assert(err == 0);

    args[i + 1] = arg;
  }

  bare_subprocess_path_t cwd;
  err = js_get_value_string_utf8(env, argv[3], cwd, sizeof(bare_subprocess_path_t), NULL);
  assert(err == 0);

  uint32_t pairs_len;
  err = js_get_array_length(env, argv[4], &pairs_len);
  assert(err == 0);

  utf8_t **pairs = calloc(pairs_len + 1 /* NULL */, sizeof(utf8_t *));

  for (uint32_t i = 0; i < pairs_len; i++) {
    js_value_t *value;
    err = js_get_element(env, argv[4], i, &value);
    assert(err == 0);

    size_t pair_len;
    err = js_get_value_string_utf8(env, value, NULL, 0, &pair_len);
    assert(err == 0);

    pair_len += 1 /* NULL */;

    utf8_t *pair = malloc(pair_len);
    err = js_get_value_string_utf8(env, value, pair, pair_len, NULL);
    assert(err == 0);

    pairs[i] = pair;
  }

  uint32_t stdio_len;
  err = js_get_array_length(env, argv[5], &stdio_len);
  assert(err == 0);

  uv_stdio_container_t *stdio = malloc(stdio_len * sizeof(uv_stdio_container_t));

  for (uint32_t i = 0; i < stdio_len; i++) {
    js_value_t *value;
    err = js_get_element(env, argv[5], i, &value);
    assert(err == 0);

    js_value_t *property;

    err = js_get_named_property(env, value, "flags", &property);
    assert(err == 0);

    uint32_t flags;
    err = js_get_value_uint32(env, property, &flags);
    assert(err == 0);

    stdio[i] = (uv_stdio_container_t){
      .flags = flags,
    };

    if (flags & UV_INHERIT_FD) {
      err = js_get_named_property(env, value, "fd", &property);
      assert(err == 0);

      uint32_t fd;
      err = js_get_value_uint32(env, property, &fd);
      assert(err == 0);

      stdio[i].data.fd = fd;
    }

    if (flags & UV_CREATE_PIPE) {
      err = js_get_named_property(env, value, "pipe", &property);
      assert(err == 0);

      uv_stream_t *pipe;
      err = js_get_typedarray_info(env, property, NULL, (void **) &pipe, NULL, NULL, NULL);
      assert(err == 0);

      stdio[i].data.stream = pipe;
    }
  }

  bool detached;
  err = js_get_value_bool(env, argv[6], &detached);
  assert(err == 0);

  uint32_t uid;
  err = js_get_value_uint32(env, argv[7], &uid);
  assert(err == 0);

  uint32_t gid;
  err = js_get_value_uint32(env, argv[8], &gid);
  assert(err == 0);

  int flags = 0;

  if (detached) flags |= UV_PROCESS_DETACHED;
  if (uid != (uint32_t) -1) flags |= UV_PROCESS_SETUID;
  if (gid != (uint32_t) -1) flags |= UV_PROCESS_SETGID;

  uv_loop_t loop;
  err = uv_loop_init(&loop);
  assert(err == 0);

  uv_process_options_t opts = {
    .exit_cb = on_exit,
    .file = (char *) file,
    .args = (char **) args,
    .env = (char **) pairs,
    .cwd = (char *) cwd,
    .flags = flags,
    .stdio_count = stdio_len,
    .stdio = stdio,
    .uid = uid,
    .gid = gid,
  };

  err = uv_spawn(&loop, (uv_process_t *) handle, &opts);

  for (uint32_t i = 0; i < args_len; i++) {
    free(args[i + 1]);
  }

  for (uint32_t i = 0; i < pairs_len; i++) {
    free(pairs[i]);
  }

  free(args);
  free(pairs);
  free(stdio);

  js_value_t *pid = NULL;

  if (err < 0) {
    js_throw_error(env, uv_err_name(err), uv_strerror(err));
  } else {
    err = js_create_uint32(env, handle->process.pid, &pid);
    assert(err == 0);

    err = uv_run(&loop, UV_RUN_DEFAULT);
    assert(err == 0);
  }

  err = uv_loop_close(&loop);
  assert(err == 0);

  return pid;
}

static js_value_t *
bare_subprocess_kill (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 2;
  js_value_t *argv[2];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 2);

  bare_subprocess_t *handle;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &handle, NULL);
  assert(err == 0);

  uint32_t signum;
  err = js_get_value_uint32(env, argv[1], &signum);
  assert(err == 0);

  err = uv_kill(handle->process.pid, signum);

  if (err < 0) {
    js_throw_error(env, uv_err_name(err), uv_strerror(err));
  }

  return NULL;
}

static js_value_t *
bare_subprocess_ref (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  bare_subprocess_t *handle;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &handle, NULL);
  assert(err == 0);

  uv_ref((uv_handle_t *) handle);

  return NULL;
}

static js_value_t *
bare_subprocess_unref (js_env_t *env, js_callback_info_t *info) {
  int err;

  size_t argc = 1;
  js_value_t *argv[1];

  err = js_get_callback_info(env, info, &argc, argv, NULL, NULL);
  assert(err == 0);

  assert(argc == 1);

  bare_subprocess_t *handle;
  err = js_get_arraybuffer_info(env, argv[0], (void **) &handle, NULL);
  assert(err == 0);

  uv_unref((uv_handle_t *) handle);

  return NULL;
}

static js_value_t *
init (js_env_t *env, js_value_t *exports) {
#define V(name, fn) \
  { \
    js_value_t *val; \
    js_create_function(env, name, -1, fn, NULL, &val); \
    js_set_named_property(env, exports, name, val); \
  }
  V("init", bare_subprocess_init)
  V("spawn", bare_subprocess_spawn)
  V("spawnSync", bare_subprocess_spawn_sync)
  V("kill", bare_subprocess_kill)
  V("ref", bare_subprocess_ref)
  V("unref", bare_subprocess_unref)
#undef V

#define V(name) \
  { \
    js_value_t *val; \
    js_create_uint32(env, name, &val); \
    js_set_named_property(env, exports, #name, val); \
  }
  V(UV_IGNORE)
  V(UV_CREATE_PIPE)
  V(UV_INHERIT_FD)
  V(UV_INHERIT_STREAM)
  V(UV_READABLE_PIPE)
  V(UV_WRITABLE_PIPE)
  V(UV_NONBLOCK_PIPE)
#undef V

  return exports;
}

BARE_MODULE(bare_subprocess, init)
