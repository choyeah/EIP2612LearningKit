# EIP2612

## 1. Permit 이란?

'permit'은 ERC-20 토큰 표준에 확장 기능으로 [EIP-2612](https://eips.ethereum.org/EIPS/eip-2612)에서 제안되었다.
퍼밋(permit) 메커니즘은 기존 ERC-20 토큰의 'approve' 및 'transferFrom' 과정을 하나의 트랜잭션으로 간소화한다.

전통적인 ERC-20 토큰에서 토큰을 전송하려면 먼저 'approve'를 호출하여 토큰을 사용할 권한을 부여한 후, 'transferFrom'을 호출해야 한다. 이는 두 번의 트랜잭션과 가스 비용을 필요로 한다.

반면 퍼밋 메커니즘은 사용자가 단일 트랜잭션으로 이러한 과정을 수행할 수 있게 해주는데, 사용자는 트랜잭션에 서명만 하고, 이 서명을 토큰 컨트랙트의 permit 함수에 전달하면, 컨트랙트는 서명을 검증하고 해당 권한을 부여받게 된다. 이후 조건에 따라 토큰을 전송한다.

단일 트랜잭션으로 토큰 승인과 전송 또는 교환을 동시에 할 수 있으므로, 트랜잭션 수를 줄이고, 가스 비용, 사용자 경험을 개선한다. 또한, 전통적인 'approve' 방식에서 사용자가 무한대의 토큰을 승인하는 경우가 많아, 스마트 계약이 해킹당하면 막대한 손실을 입을 수 있는데 반하여 permit를 사용하면 필요한 만큼만 승인하고, 사용 후에는 자동으로 권한이 제거되어 보안성도 높아진다.

## 2. Specification

ERC-20에 다음 세 가지 함수를 구현해야한다.

```
function permit(address owner, address spender, uint value, uint deadline, uint8 v, bytes32 r, bytes32 s) external
function nonces(address owner) external view returns (uint)
function DOMAIN_SEPARATOR() external view returns (bytes32)
```

## 3. 전체 구현 코드

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract EIP2612PermitToken is ERC20, EIP712 {
    using ECDSA for bytes32;

    // EIP-2612의 nonce를 저장하기 위한 매핑
    mapping(address => uint256) private _nonces;

    // EIP-712 도메인 구분자를 위한 타입해시 변수
    bytes32 public constant PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
        );

    constructor(
        string memory name,
        string memory symbol,
        uint256 _supply
    ) ERC20(name, symbol) EIP712(name, "1") {
        _mint(msg.sender, _supply);
    }

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(block.timestamp <= deadline, "PERMIT_DEADLINE_EXPIRED");

        bytes32 structHash = keccak256(
            abi.encode(
                PERMIT_TYPEHASH,
                owner,
                spender,
                value,
                _nonces[owner]++,
                deadline
            )
        );

        // _hashTypedDataV4()는 오픈제플린 EIP712 컨트랙트에 구현된 함수
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(v, r, s);
        require(signer == owner, "INVALID_SIGNER");

        _approve(owner, spender, value);
    }

    function nonces(address owner) external view returns (uint) {
        return _nonces[owner];
    }

    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

```

### 3-1. permit():

permit 함수는 토큰 소유자가 오프체인(프론트엔드 | 블록체인 외부)에서 서명한 시그니처를 제 3자에게 제공하여 제 3자가 다른 주소(EOA, COA)에 토큰 사용할 권한(approve, transfer)을 부여하는 기능을 제공한다.

- 매개변수

  - owner: 토큰 소유자
  - spender: 승인받을 주소
  - value: 전송할 토큰의 양
  - deadline: 허가의 만료 시간, deadline을 가깝게 만들어 유효 기간을 제한할 수 있으며, uint256(-1)로 설정하여 사실상 만료되지 않는 Permit을 생성할 수도 있다.
  - v, r, s: ECDSA 서명의 일부인 v, r, s 값

- 로직
  서명이 유효한지 확인한다.
  [EIP712](https://velog.io/@choyeah/EIP712) 메세지 구조체 서명 방식에 기반하여 메세지를 서명하고 이를 복원(ECDSA.recover)하여 owner와 서명자의 일치여부를 확인하고 일치하면 appove 하여 spender에게 value만큼의 토큰 사용을 승인시킨다.
  nonce는 토큰 소유자의 주소에 대한 고유한 값으로, 재사용 공격을 방지하기 위해 실행시마다 업데이트 해준다.
  [EIP712 참고](https://velog.io/@choyeah/EIP712)

### 3-2. nonces():

nonces 함수는 특정 토큰 소유자의 현재 nonce 값을 반환한다. nonce는 토큰 소유자의 주소마다 고유하게 관리되며, 각 토큰 소유자의 허가(permit) 요청이 중복되지 않도록 보장한다. 이는 permit 함수에서 사용되며, 토큰 소유자가 허가를 할 때마다 해당 nonce 값이 증가한다.

### 3-3. DOMAIN_SEPARATOR():

DOMAIN_SEPARATOR 함수는 EIP-712 표준에 따라 구성된 도메인 구분자를 반환한다. 이 구분자는 서명된 데이터가 특정 도메인(예: 특정 스마트 계약)에 속함을 나타내며, 다른 도메인의 서명과 구분하는 데 사용된다. 이 함수는 permit 함수에서 생성되는 서명의 유효성을 검증하는 데 필요한 핵심 요소 중 하나이다.

```
//@openzeppelin/contracts/utils/cryptography/EIP712.sol

    /**
     * @dev Returns the domain separator for the current chain.
     */
    function _domainSeparatorV4() internal view returns (bytes32) {
        if (address(this) == _cachedThis && block.chainid == _cachedChainId) {
            return _cachedDomainSeparator;
        } else {
            return _buildDomainSeparator();
        }
    }

    function _buildDomainSeparator() private view returns (bytes32) {
        return keccak256(abi.encode(TYPE_HASH, _hashedName, _hashedVersion, block.chainid, address(this)));
    }

```

## 4. 컨트랙트 및 테스트 코드

https://github.com/choyeah/EIP2612LearningKit

1. env 파일 셋팅
2. 패키지 다운로드

```
npm i
```

3. 테스트 코드 실행

```
npx hardhat test
```
