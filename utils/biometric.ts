/**
 * Copyright 2024-2026 Artem Iagovdik <artyom.yagovdik@gmail.com>
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react'

export type BiometricType = 'touchid' | 'hello' | null

export function detectBiometricType(): BiometricType {
  const platform = navigator.platform.toLowerCase()
  if (platform.includes('mac') || platform.includes('iphone') || platform.includes('ipad')) {
    return 'touchid'
  }
  if (platform.includes('win')) {
    return 'hello'
  }
  return null
}

export function useBiometricType(): BiometricType {
  const [type, setType] = useState<BiometricType>(null)
  useEffect(() => {
    setType(detectBiometricType())
  }, [])
  return type
}

export function getBiometricName(type: BiometricType): string {
  if (type === 'touchid') return 'Touch ID'
  if (type === 'hello') return 'Windows Hello'
  return 'Biometric unlock'
}
