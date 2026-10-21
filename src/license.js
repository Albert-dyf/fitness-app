// ↓↓↓ 用 print-pub.cjs 打印出来的那行替换 ↓↓↓
const PUBLIC_KEY_B64 = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEoBQZxhraVqk/9vF08MzewbCF4hDxT53XXen6j0hlswRas9+1AkHmPluMOHCUypGhEcOtyUWghBFyzHKBUtw4gg=='

const CODE_KEY = 'powerlog_license_code'

function b64urlToBytes(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

async function importPublicKey() {
  const der = Uint8Array.from(atob(PUBLIC_KEY_B64), c => c.charCodeAt(0))
  return crypto.subtle.importKey(
    'spki', der,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['verify']
  )
}

// 校验激活码真伪：用公钥验签名，伪造/乱填一律 false
export async function verifyCode(code) {
  try {
    const str = String(code).trim()
    const i = str.lastIndexOf('.')
    if (i <= 0) return false
    const payload = str.slice(0, i)
    const sig = b64urlToBytes(str.slice(i + 1))
    const key = await importPublicKey()
    return await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key, sig,
      new TextEncoder().encode(payload)
    )
  } catch (e) {
    return false
  }
}

export function getSavedCode() {
  return localStorage.getItem(CODE_KEY) || ''
}
export function saveCode(code) {
  localStorage.setItem(CODE_KEY, code)
}
// 进页面时复验：本地存的码合法才算 Pro（防止手动改 localStorage 假解锁）
export async function restorePro() {
  const code = getSavedCode()
  return code ? await verifyCode(code) : false
}